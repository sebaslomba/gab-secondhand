-- Fotos de las prendas: columna en la tabla, lugar para guardarlas (Storage) y permisos.
-- Se corre una vez en Supabase (SQL Editor). Se puede volver a correr sin problema.

alter table prendas add column if not exists fotos text[] not null default '{}';

-- La vista pública suma las fotos (al final, para no romper las columnas que ya tenía).
create or replace view catalogo with (security_invoker = false) as
  select id, titulo, marca, talle, precio, categoria, condicion, dibujo, color, fondo,
         estado_efectivo(estado, reservada_hasta) as estado,
         case when estado = 'reservada' and reservada_hasta > now() then reservada_hasta end as reservada_hasta,
         creada, fotos
  from prendas;
grant select on catalogo to anon, authenticated;

-- Carpeta pública "fotos": cualquiera las ve, solo la admin sube o borra.
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do update set public = true;

drop policy if exists fotos_admin_subir on storage.objects;
create policy fotos_admin_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.es_admin());
drop policy if exists fotos_admin_editar on storage.objects;
create policy fotos_admin_editar on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and public.es_admin());
drop policy if exists fotos_admin_borrar on storage.objects;
create policy fotos_admin_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.es_admin());
