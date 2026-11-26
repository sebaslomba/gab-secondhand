-- ⚠️ BORRA TODO LO DE PRUEBA para arrancar de cero el día del lanzamiento. NO SE PUEDE DESHACER.
-- Borra: prendas, pedidos, gastos e ingresos anotados, etiquetas y días sin envío.
-- NO borra: la cuenta de Gab (admins), la estructura de las tablas ni las funciones.
-- Las fotos se borran aparte: Supabase > Storage > fotos > seleccionar todo > Delete.

begin;
delete from pedidos;
delete from prendas;
delete from gastos;
delete from etiquetas;
delete from dias_sin_envio;
commit;
