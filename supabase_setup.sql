-- ============================================================
-- PAP Apícola · Script de creación de tabla en Supabase
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

create table if not exists public.visitas (
  uuid text primary key,
  f1_nombre text, f2_apellido text, f3_rut text, f4_telefono text, f5_email text,
  f6_region text, f7_comuna text, f8_area_indap text, f9_dir_propiedad text, f10_dir_predio text,
  f11_fecha_nacimiento text, f12_genero text, f13_pueblo_originario text, f14_nivel_educacional text,
  f15_poder_comprador text, f16_rubro_negocio text, f17_unidad_operativa text, f18_programa_indap text,
  f19_fecha_encuesta text, f20_numero_encuesta text,
  f21_iniciacion_actividades text, f22_tipo_tributacion text, f23_habilitado_poder_comprador text,
  f24_especie_principal text, f25_variedad_raza_e1 text, f26_epoca_cosecha_e1 text,
  f27_tipo_manejo_e1 text, f28_certificacion_e1 text,
  f29_colmenas_2023_e1 text, f30_colmenas_2024_e1 text,
  f31_cant_producida_2023_e1 text, f32_cant_producida_2024_e1 text,
  f33_cant_vendida_2023_e1 text, f34_cant_vendida_2024_e1 text,
  f35_unidad_2023_e1 text, f36_unidad_2024_e1 text,
  f37_monto_vendido_2023_e1 text, f38_monto_vendido_2024_e1 text,
  f39_especie_secundaria text, f40_variedad_raza_e2 text, f41_epoca_cosecha_e2 text,
  f42_tipo_manejo_e2 text, f43_certificacion_e2 text,
  f44_colmenas_2023_e2 text, f45_colmenas_2024_e2 text,
  f46_cant_producida_2023_e2 text, f47_cant_producida_2024_e2 text,
  f48_cant_vendida_2023_e2 text, f49_cant_vendida_2024_e2 text,
  f50_unidad_e2 text,
  f52_monto_vendido_2023_e2 text, f53_monto_vendido_2024_e2 text,
  f64_ingresos_totales text, f65_costo_produccion text, f66_margen_bruto text,
  f67_estandar1 text, f68_estandar2 text, f69_estandar3 text,
  f70_tipo_estandar1 text, f71_tipo_estandar2 text, f72_tipo_estandar3 text,
  f73_cumple_estandar1 text, f74_cumple_estandar2 text, f75_cumple_estandar3 text,
  f76_nivel_comercial text, f77_nivel_productivo text, f78_nivel_calidad text,
  f79_pc1 text, f80_pc2 text, f81_pc3 text, f82_pc4 text, f83_pc5 text,
  f84_tipo_pc1 text, f85_tipo_pc2 text, f86_tipo_pc3 text, f87_tipo_pc4 text, f88_tipo_pc5 text,
  f89_solucion_pc1 text, f90_solucion_pc2 text, f91_solucion_pc3 text, f92_solucion_pc4 text, f93_solucion_pc5 text,
  f94_inversion_pc1 text, f95_inversion_pc2 text, f96_inversion_pc3 text, f97_inversion_pc4 text, f98_inversion_pc5 text,
  f99_no_encuesto text, f100_notas text,
  nombre_encuestador text,
  brechas_pc1 text, brechas_tipo_pc1 text, brechas_solucion_pc1 text, brechas_inversion_pc1 text,
  brechas_pc2 text, brechas_tipo_pc2 text, brechas_solucion_pc2 text, brechas_inversion_pc2 text,
  brechas_pc3 text, brechas_tipo_pc3 text, brechas_solucion_pc3 text, brechas_inversion_pc3 text,
  brechas_pc4 text, brechas_tipo_pc4 text, brechas_solucion_pc4 text, brechas_inversion_pc4 text,
  brechas_pc5 text, brechas_tipo_pc5 text, brechas_solucion_pc5 text, brechas_inversion_pc5 text,
  brechas_nota text,
  sync_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Habilitar acceso público sin autenticación (Row Level Security desactivado)
alter table public.visitas enable row level security;

create policy "Acceso público total" on public.visitas
  for all using (true) with check (true);

-- Índice para sincronización eficiente por fecha
create index if not exists visitas_updated_at_idx on public.visitas (updated_at);
