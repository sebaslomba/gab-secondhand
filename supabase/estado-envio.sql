-- Estado de cada envío, en orden: reservado → pendiente de envío → enviado → entregado.
-- No hay retiro en local: todo sale por envío.
-- Se corre una vez en Supabase (SQL Editor), después de envios.sql. Se puede volver a correr sin problema
-- (también si ya corriste la versión anterior de este archivo).

alter table pedidos add column if not exists envio_estado text not null default 'reservado';
alter table pedidos alter column envio_estado set default 'reservado';
alter table pedidos drop constraint if exists pedidos_envio_estado_check;

-- Pasa los nombres de la versión anterior a los nuevos.
update pedidos set envio_estado = case envio_estado
  when 'retirar' then 'pendiente'
  when 'delivery' then 'enviado'
  when 'camino' then 'enviado'
  else envio_estado end
where envio_estado in ('retirar', 'delivery', 'camino');

-- Los pedidos que ya estaban marcados como enviados quedan como entregados.
update pedidos set envio_estado = 'entregado' where enviado and envio_estado <> 'entregado';

alter table pedidos add constraint pedidos_envio_estado_check
  check (envio_estado in ('reservado', 'pendiente', 'enviado', 'entregado'));
