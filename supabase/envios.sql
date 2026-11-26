-- Envíos: pago, día y forma de envío de cada pedido confirmado, etiquetas de color y días sin envíos.
-- Se corre una vez en Supabase (SQL Editor). Se puede volver a correr sin problema.

alter table pedidos add column if not exists pago text not null default 'pendiente';
alter table pedidos add column if not exists envio_fecha date;
alter table pedidos add column if not exists envio_metodo text;            -- 'delivery' (propio) o 'courier'
alter table pedidos add column if not exists enviado boolean not null default false;
alter table pedidos add column if not exists etiquetas uuid[] not null default '{}';
alter table pedidos add column if not exists cliente text not null default '';
alter table pedidos add column if not exists nota text not null default '';

do $$ begin
  alter table pedidos add constraint pedidos_pago_check check (pago in ('pendiente', 'pagado'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table pedidos add constraint pedidos_metodo_check check (envio_metodo is null or envio_metodo in ('delivery', 'courier'));
exception when duplicate_object then null; end $$;

-- El panel puede editar estos datos del pedido (antes solo podía leerlos).
drop policy if exists admin_pedidos_editar on pedidos;
create policy admin_pedidos_editar on pedidos for update using (es_admin()) with check (es_admin());
grant update on pedidos to authenticated;

-- Etiquetas que crea Gab (nombre + color pastel).
create table if not exists etiquetas (
  id     uuid primary key default gen_random_uuid(),
  nombre text not null,
  color  text not null default '#F4C9D6',
  creada timestamptz not null default now()
);
alter table etiquetas enable row level security;
drop policy if exists admin_etiquetas on etiquetas;
create policy admin_etiquetas on etiquetas for all using (es_admin()) with check (es_admin());
revoke all on etiquetas from anon;
grant select, insert, update, delete on etiquetas to authenticated;

-- Días en que no se hacen envíos (se marcan en el calendario).
create table if not exists dias_sin_envio (
  fecha date primary key
);
alter table dias_sin_envio enable row level security;
drop policy if exists admin_dias on dias_sin_envio;
create policy admin_dias on dias_sin_envio for all using (es_admin()) with check (es_admin());
revoke all on dias_sin_envio from anon;
grant select, insert, delete on dias_sin_envio to authenticated;
