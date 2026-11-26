-- Para anotar ingresos a mano en Finanzas (si ya corriste finanzas.sql antes). Se puede volver a correr.
alter table gastos add column if not exists tipo text not null default 'egreso';
do $$ begin
  alter table gastos add constraint gastos_tipo_check check (tipo in ('ingreso', 'egreso'));
exception when duplicate_object then null; end $$;
