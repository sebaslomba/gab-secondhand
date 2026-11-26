-- Finanzas: fecha de venta de cada prenda y gastos manuales (envíos, bolsas, etc.).
-- Se corre una vez en Supabase (SQL Editor). Se puede volver a correr sin problema.

-- 1) Fecha en que se vendió cada prenda, para agrupar las ventas por mes.
alter table prendas add column if not exists vendida_en timestamptz;

-- Las que ya estaban vendidas toman la fecha de su pedido (o la de carga si se marcaron a mano).
update prendas p set vendida_en = coalesce((select o.creado from pedidos o where o.id = p.pedido_id), p.creada)
  where p.estado = 'vendida' and p.vendida_en is null;

-- De acá en adelante se completa sola cuando una prenda pasa a Vendida (y se borra si vuelve atrás).
create or replace function marcar_fecha_venta() returns trigger language plpgsql as $$
begin
  if new.estado = 'vendida' then
    if tg_op = 'INSERT' or old.estado <> 'vendida' or new.vendida_en is null then
      new.vendida_en := coalesce(new.vendida_en, now());
    end if;
  else
    new.vendida_en := null;
  end if;
  return new;
end $$;

drop trigger if exists prendas_fecha_venta on prendas;
create trigger prendas_fecha_venta before insert or update of estado on prendas
  for each row execute function marcar_fecha_venta();

-- 2) Gastos que no son prendas: envíos, bolsas, publicidad, etc.
create table if not exists gastos (
  id       uuid primary key default gen_random_uuid(),
  fecha    date not null default current_date,
  concepto text not null,
  monto    integer not null check (monto > 0),   -- guaraníes
  creado   timestamptz not null default now()
);

alter table gastos enable row level security;
drop policy if exists admin_gastos on gastos;
create policy admin_gastos on gastos for all using (es_admin()) with check (es_admin());
revoke all on gastos from anon;
grant select, insert, update, delete on gastos to authenticated;

-- 3) Ingresos anotados a mano (live de TikTok, grupo de WhatsApp…) van en la misma tabla, con tipo 'ingreso'.
alter table gastos add column if not exists tipo text not null default 'egreso';
do $$ begin
  alter table gastos add constraint gastos_tipo_check check (tipo in ('ingreso', 'egreso'));
exception when duplicate_object then null; end $$;
