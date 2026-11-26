-- Arreglo del envío a WhatsApp: correr una vez en Supabase > SQL Editor.
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
    -- md5 + gen_random_uuid vienen con Postgres: no dependen de pgcrypto, que en Supabase vive en otro esquema.
    v_codigo := upper(substr(md5(gen_random_uuid()::text), 1, 5));
    exit when not exists (select 1 from pedidos where codigo = v_codigo);
  end loop;

  insert into pedidos (id, codigo, prendas, zona, total, vence)
    values (v_pedido, v_codigo, v_ids, coalesce(p_zona, ''), v_total, v_vence);
  update prendas set estado = 'reservada', reservada_hasta = v_vence, pedido_id = v_pedido
    where id = any(v_ids);

  return jsonb_build_object('ok', true, 'pedido', v_pedido, 'codigo', v_codigo, 'vence', v_vence);
end $$;
