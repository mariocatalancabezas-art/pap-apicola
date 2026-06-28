-- Observaciones Apicultores para Visita Técnica
-- Categorías: Técnico J.Riquelme y Técnico E.Burgos (nombres editables por admin)

-- 1. Almacenamiento de las observaciones en el apicultor (JSON: { jriquelme: [...], eburgos: [...] })
ALTER TABLE public.apicultores ADD COLUMN IF NOT EXISTS observaciones_tecnica JSONB;

-- 2. Permisos por categoría en los usuarios (solo el admin los otorga)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_ver_observaciones_tecnico_jriquelme BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_editar_observaciones_tecnico_jriquelme BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_ver_observaciones_tecnico_eburgos BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_editar_observaciones_tecnico_eburgos BOOLEAN DEFAULT false;

-- 3. Tabla de configuración para los nombres editables de las categorías
CREATE TABLE IF NOT EXISTS public.configuracion (
  clave TEXT PRIMARY KEY,
  valor TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
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
