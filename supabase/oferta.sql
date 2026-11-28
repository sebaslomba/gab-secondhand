-- Ofertas: "precio antes" opcional. Si es mayor que el precio, la prenda sale con el listón rojo de Oferta.
-- Se corre una vez en Supabase (SQL Editor). Se puede volver a correr sin problema.

alter table prendas add column if not exists precio_antes integer;

-- La vista pública suma el precio anterior (al final, para no romper las columnas que ya tenía).
create or replace view catalogo with (security_invoker = false) as
  select id, titulo, marca, talle, precio, categoria, condicion, dibujo, color, fondo,
         estado_efectivo(estado, reservada_hasta) as estado,
         case when estado = 'reservada' and reservada_hasta > now() then reservada_hasta end as reservada_hasta,
         creada, fotos, precio_antes
  from prendas;
grant select on catalogo to anon, authenticated;
