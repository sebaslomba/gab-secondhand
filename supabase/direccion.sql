-- Dirección de envío de cada pedido (Gab la pega desde el panel, en Pedidos).
alter table pedidos add column if not exists direccion text not null default '';
