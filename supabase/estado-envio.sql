-- Estado de cada envío: por retirar → con el delivery → en camino → entregado.
-- Se corre una vez en Supabase (SQL Editor), después de envios.sql. Se puede volver a correr sin problema.

alter table pedidos add column if not exists envio_estado text not null default 'retirar';

do $$ begin
  alter table pedidos add constraint pedidos_envio_estado_check
    check (envio_estado in ('retirar', 'delivery', 'camino', 'entregado'));
exception when duplicate_object then null; end $$;

-- Los pedidos que ya estaban marcados como enviados quedan como entregados.
update pedidos set envio_estado = 'entregado' where enviado and envio_estado <> 'entregado';
