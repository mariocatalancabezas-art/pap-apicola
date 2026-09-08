-- Reconciliación del esquema remoto con lo que la app escribe.
-- Idempotente: se puede ejecutar varias veces en Supabase → SQL Editor.

-- ============================================================
-- APICULTORES (la tabla real nunca estuvo declarada en el repo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.apicultores (
  uuid TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS nombre_completo TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS nombres TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS apellidos TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS rut TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS n_reg_sag TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS comuna TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS direccion TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS programa_indap TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS usuario_sipec TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS contraseña_sipec TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS contraseña_sii TEXT;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS observaciones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS observaciones_tecnica JSONB;
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_apicultores_uuid ON public.apicultores(uuid);
CREATE INDEX IF NOT EXISTS idx_apicultores_updated_at ON public.apicultores(updated_at);
CREATE INDEX IF NOT EXISTS idx_apicultores_deleted_at ON public.apicultores(deleted_at);

ALTER TABLE public.apicultores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.apicultores TO anon, authenticated;
DROP POLICY IF EXISTS "Apicultores acceso total" ON public.apicultores;
CREATE POLICY "Apicultores acceso total" ON public.apicultores FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- VISITAS (diagnóstico, técnica y administrativa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.visitas (
  uuid TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
DO $$
DECLARE
  col TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'tipo_visita', 'nombre_encuestador',
    'f1_nombre','f2_apellido','f3_rut','f4_telefono','f5_email',
    'f6_region','f7_comuna','f8_area_indap','f9_dir_propiedad','f10_dir_predio',
    'f11_fecha_nacimiento','f12_genero','f13_pueblo_originario','f14_nivel_educacional',
    'f15_poder_comprador','f16_rubro_negocio','f17_unidad_operativa','f18_programa_indap',
    'f19_fecha_encuesta','f20_numero_encuesta',
    'f21_iniciacion_actividades','f22_tipo_tributacion','f23_habilitado_poder_comprador',
    'f24_especie_principal','f25_variedad_raza_e1','f26_epoca_cosecha_e1','f27_tipo_manejo_e1','f28_certificacion_e1',
    'f29_colmenas_2023_e1','f30_colmenas_2024_e1','f31_cant_producida_2023_e1','f32_cant_producida_2024_e1',
    'f33_cant_vendida_2023_e1','f34_cant_vendida_2024_e1','f35_unidad_2023_e1','f36_unidad_2024_e1',
    'f37_monto_vendido_2023_e1','f38_monto_vendido_2024_e1',
    'f39_especie_secundaria','f40_variedad_raza_e2','f41_epoca_cosecha_e2','f42_tipo_manejo_e2','f43_certificacion_e2',
    'f44_colmenas_2023_e2','f45_colmenas_2024_e2','f46_cant_producida_2023_e2','f47_cant_producida_2024_e2',
    'f48_cant_vendida_2023_e2','f49_cant_vendida_2024_e2','f50_unidad_e2',
    'f52_monto_vendido_2023_e2','f53_monto_vendido_2024_e2',
    'f64_ingresos_totales','f65_costo_produccion','f66_margen_bruto',
    'f67_estandar1','f68_estandar2','f69_estandar3',
    'f70_tipo_estandar1','f71_tipo_estandar2','f72_tipo_estandar3',
    'f73_cumple_estandar1','f74_cumple_estandar2','f75_cumple_estandar3',
    'f76_nivel_comercial','f77_nivel_productivo','f78_nivel_calidad',
    'f79_pc1','f80_pc2','f81_pc3','f82_pc4','f83_pc5',
    'f84_tipo_pc1','f85_tipo_pc2','f86_tipo_pc3','f87_tipo_pc4','f88_tipo_pc5',
    'f89_solucion_pc1','f90_solucion_pc2','f91_solucion_pc3','f92_solucion_pc4','f93_solucion_pc5',
    'f94_inversion_pc1','f95_inversion_pc2','f96_inversion_pc3','f97_inversion_pc4','f98_inversion_pc5',
    'f99_no_encuesto','f100_notas',
    'brechas_pc1','brechas_tipo_pc1','brechas_solucion_pc1','brechas_inversion_pc1',
    'brechas_pc2','brechas_tipo_pc2','brechas_solucion_pc2','brechas_inversion_pc2',
    'brechas_pc3','brechas_tipo_pc3','brechas_solucion_pc3','brechas_inversion_pc3',
    'brechas_pc4','brechas_tipo_pc4','brechas_solucion_pc4','brechas_inversion_pc4',
    'brechas_pc5','brechas_tipo_pc5','brechas_solucion_pc5','brechas_inversion_pc5',
    'brechas_nota',
    'asb_anios_apicultura','asb_motivacion','asb_talleres_interes',
    'asb_nos_entrego_miel','asb_sala_autorizada','asb_sala_pronta_autorizar','asb_que_le_falta',
    'vt_nombre_tecnico','vt_fecha_visita','vt_nombre_apiario','vt_num_colmenas','vt_actividad_principal',
    'vt_varroa_pct','vt_enfermedades','vt_tratamientos','vt_fecha_ultimo_tratamiento',
    'vt_prod_anterior','vt_prod_estimada','vt_tipo_miel',
    'vt_alimentacion','vt_renovacion_reinas','vt_recambio_marcos','vt_calendario_manejo',
    'vt_problemas','vt_recomendaciones','vt_compromisos','vt_fecha_proxima_visita',
    'vt_informe','vt_firma_tecnico','vt_firma_apicultor',
    'va_nombre_tecnico','va_fecha_visita','va_tema_principal','va_tema_otro',
    'va_observaciones','va_acuerdos','va_firma_asesor','va_firma_usuario'
  ] LOOP
    EXECUTE format('ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS %I TEXT', col);
  END LOOP;
END $$;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS visitas_uuid_idx ON public.visitas(uuid);
CREATE INDEX IF NOT EXISTS visitas_updated_at_idx ON public.visitas(updated_at);
CREATE INDEX IF NOT EXISTS visitas_deleted_at_idx ON public.visitas(deleted_at);

ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.visitas TO anon, authenticated;
DROP POLICY IF EXISTS "Acceso público total" ON public.visitas;
CREATE POLICY "Acceso público total" ON public.visitas FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- EQUIPO TÉCNICO
-- ============================================================
ALTER TABLE public.equipo_tecnico ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- El sync hace upsert con onConflict: 'uuid'; sin índice único el upsert falla.
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipo_tecnico_uuid ON public.equipo_tecnico(uuid);
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.equipo_tecnico TO anon, authenticated;

-- ============================================================
-- CALENDARIO DE ACTIVIDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actividad TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME,
  lugar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON public.actividades(fecha);
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.actividades TO anon, authenticated;
DROP POLICY IF EXISTS "Permitir inserciones anónimas" ON public.actividades;
DROP POLICY IF EXISTS "Permitir lecturas anónimas" ON public.actividades;
DROP POLICY IF EXISTS "Permitir actualizaciones anónimas" ON public.actividades;
DROP POLICY IF EXISTS "Permitir eliminaciones anónimas" ON public.actividades;
CREATE POLICY "Permitir inserciones anónimas" ON public.actividades FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lecturas anónimas" ON public.actividades FOR SELECT USING (true);
CREATE POLICY "Permitir actualizaciones anónimas" ON public.actividades FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminaciones anónimas" ON public.actividades FOR DELETE USING (true);
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_editar_calendario BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_eliminar_calendario BOOLEAN DEFAULT false;

-- ============================================================
-- CONFIGURACIÓN (nombres editables de observaciones técnicas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.configuracion TO anon, authenticated;
DROP POLICY IF EXISTS "config_select" ON public.configuracion;
DROP POLICY IF EXISTS "config_insert" ON public.configuracion;
DROP POLICY IF EXISTS "config_update" ON public.configuracion;
CREATE POLICY "config_select" ON public.configuracion FOR SELECT USING (true);
CREATE POLICY "config_insert" ON public.configuracion FOR INSERT WITH CHECK (true);
CREATE POLICY "config_update" ON public.configuracion FOR UPDATE USING (true);
INSERT INTO public.configuracion (clave, valor) VALUES
  ('obs_tecnica_label_jriquelme', 'Técnico J.Riquelme'),
  ('obs_tecnica_label_eburgos', 'Técnico E.Burgos')
ON CONFLICT (clave) DO NOTHING;
