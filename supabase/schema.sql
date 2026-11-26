-- Gab Secondhand: prendas, pedidos y reserva atómica.
-- Se corre una vez en Supabase (SQL Editor). Es idempotente donde se puede.

create extension if not exists pgcrypto;

do $$ begin
  create type estado_prenda as enum ('disponible', 'reservada', 'vendida');
exception when duplicate_object then null; end $$;

create table if not exists prendas (
  id              text primary key,            -- código visible, ej. GS-101
  titulo          text not null,
  marca           text not null default '',
  talle           text not null default '',
  precio          integer not null check (precio >= 0),   -- guaraníes
  categoria       text not null default '',
  condicion       text not null default '',
  costo           integer not null default 0,  -- solo lo ve el admin
  dibujo          text not null default 'tee', -- ilustración de ejemplo hasta tener fotos
  color           text not null default '#F5F0E6',
  fondo           text not null default '#F3E9E3',
  estado          estado_prenda not null default 'disponible',
  reservada_hasta timestamptz,
  pedido_id       uuid,
  creada          timestamptz not null default now()
);

create table if not exists pedidos (
  id        uuid primary key default gen_random_uuid(),  -- secreto: solo lo conoce quien hizo el pedido
  codigo    text unique not null,                        -- corto, para hablar por WhatsApp
  prendas   text[] not null,
  zona      text not null default '',
  total     integer not null,
  estado    text not null default 'pendiente'
            check (estado in ('pendiente', 'confirmado', 'cancelado', 'reemplazado')),
  creado    timestamptz not null default now(),
  vence     timestamptz not null
);

create table if not exists admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- Estado real: una reserva vencida cuenta como disponible, sin necesidad de un proceso que la libere.
create or replace function estado_efectivo(e estado_prenda, hasta timestamptz)
returns estado_prenda language sql stable as $$
  select case when e = 'reservada' and (hasta is null or hasta <= now()) then 'disponible'::estado_prenda else e end
$$;

-- Lo que ve el público (sin costo).
create or replace view catalogo with (security_invoker = false) as
  select id, titulo, marca, talle, precio, categoria, condicion, dibujo, color, fondo,
         estado_efectivo(estado, reservada_hasta) as estado,
         case when estado = 'reservada' and reservada_hasta > now() then reservada_hasta end as reservada_hasta
  from prendas;

alter table prendas enable row level security;
alter table pedidos enable row level security;
alter table admins  enable row level security;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

drop policy if exists admin_prendas on prendas;
create policy admin_prendas on prendas for all using (es_admin()) with check (es_admin());
drop policy if exists admin_pedidos on pedidos;
create policy admin_pedidos on pedidos for select using (es_admin());

revoke all on prendas, pedidos, admins from anon;
grant select on catalogo to anon, authenticated;

-- Reserva todo o nada. Si una sola prenda no está libre, no se reserva ninguna.
-- p_anterior: id del pedido previo de la misma persona (si vuelve a enviar con más prendas,
-- sus prendas ya reservadas cuentan como suyas y el pedido viejo queda reemplazado).
create or replace function reservar_prendas(p_ids text[], p_zona text, p_envio integer, p_minutos integer default 15, p_anterior uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_ids text[] := array(select distinct unnest(p_ids) order by 1);
  v_no text[];
  v_total integer;
  v_pedido uuid := gen_random_uuid();
  v_codigo text;
  v_vence timestamptz := now() + make_interval(mins => greatest(1, least(p_minutos, 60)));
begin
  if coalesce(array_length(v_ids, 1), 0) = 0 or array_length(v_ids, 1) > 30 then
    raise exception 'pedido vacío o demasiado grande';
  end if;

  -- Bloquea las filas en orden fijo: si dos personas llegan juntas, la segunda espera a la primera.
  perform 1 from prendas where id = any(v_ids) order by id for update;

  select array_agg(x.id order by x.id) into v_no
  from unnest(v_ids) as x(id)
  left join prendas p on p.id = x.id
  where p.id is null
     or not (estado_efectivo(p.estado, p.reservada_hasta) = 'disponible'
             or (p_anterior is not null and p.estado = 'reservada' and p.pedido_id = p_anterior and p.reservada_hasta > now()));

  if v_no is not null then
    return jsonb_build_object('ok', false, 'no_disponibles',
      (select jsonb_agg(jsonb_build_object('id', n.id, 'estado', coalesce(estado_efectivo(p.estado, p.reservada_hasta)::text, 'no_existe')))
       from unnest(v_no) as n(id) left join prendas p on p.id = n.id));
  end if;

  -- Libera lo que el pedido anterior tenía y esta vez no vino.
  if p_anterior is not null then
    update prendas set estado = 'disponible', reservada_hasta = null, pedido_id = null
      where pedido_id = p_anterior and estado = 'reservada' and not (id = any(v_ids));
    update pedidos set estado = 'reemplazado' where id = p_anterior and estado = 'pendiente';
  end if;

  select sum(precio)::integer + greatest(coalesce(p_envio, 0), 0) into v_total from prendas where id = any(v_ids);
  loop
    v_codigo := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 5));
    exit when not exists (select 1 from pedidos where codigo = v_codigo);
  end loop;

  insert into pedidos (id, codigo, prendas, zona, total, vence)
    values (v_pedido, v_codigo, v_ids, coalesce(p_zona, ''), v_total, v_vence);
  update prendas set estado = 'reservada', reservada_hasta = v_vence, pedido_id = v_pedido
    where id = any(v_ids);

  return jsonb_build_object('ok', true, 'pedido', v_pedido, 'codigo', v_codigo, 'vence', v_vence);
end $$;

-- Para el backoffice: confirmar la venta o cancelar el pedido.
create or replace function confirmar_pedido(p_pedido uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'solo admin'; end if;
  update prendas set estado = 'vendida', reservada_hasta = null where pedido_id = p_pedido;
  update pedidos set estado = 'confirmado' where id = p_pedido;
end $$;

create or replace function cancelar_pedido(p_pedido uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_admin() then raise exception 'solo admin'; end if;
  update prendas set estado = 'disponible', reservada_hasta = null, pedido_id = null
    where pedido_id = p_pedido and estado = 'reservada';
  update pedidos set estado = 'cancelado' where id = p_pedido;
end $$;

revoke all on function reservar_prendas(text[], text, integer, integer, uuid) from public, anon, authenticated;
grant execute on function reservar_prendas(text[], text, integer, integer, uuid) to service_role;
revoke all on function confirmar_pedido(uuid), cancelar_pedido(uuid) from public, anon;
grant execute on function confirmar_pedido(uuid), cancelar_pedido(uuid) to authenticated;
