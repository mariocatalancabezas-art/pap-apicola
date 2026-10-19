-- Tabla para controlar qué versiones de la app pueden acceder
create table if not exists app_versions (
  version text primary key,
  is_active boolean not null default true,
  activated_at timestamp with time zone default now(),
  notes text
);

-- Insertar versión 2.0 como activa
insert into app_versions (version, is_active, notes)
values ('2.0', true, 'Versión protegida contra borrados automáticos')
on conflict (version) do update set
  is_active = true,
  activated_at = now(),
  notes = 'Versión protegida contra borrados automáticos';

-- Marcar todas las otras versiones como inactivas
update app_versions
set is_active = false
where version != '2.0';

-- Política: solo permitir lectura de versiones activas
alter table app_versions enable row level security;

create policy "Allow read active versions"
  on app_versions for select
  using (is_active = true);

create policy "No insert/delete"
  on app_versions for all
  using (false);
