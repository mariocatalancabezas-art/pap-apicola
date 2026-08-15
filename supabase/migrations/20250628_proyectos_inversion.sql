-- Proyectos de inversión de los apicultores del programa
CREATE TABLE IF NOT EXISTS public.proyectos_inversion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  apicultor_nombre TEXT NOT NULL,
  apicultor_rut TEXT,
  apicultor_telefono TEXT,
  apicultor_email TEXT,
  apicultor_comuna TEXT,
  apicultor_direccion TEXT,
  nombre_proyecto TEXT NOT NULL,
  detalle_proyecto TEXT,
  monto_indap BIGINT DEFAULT 0,
  monto_propio BIGINT DEFAULT 0,
  solicita_credito BOOLEAN DEFAULT FALSE,
  monto_credito BIGINT DEFAULT 0,
  monto_total BIGINT DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyectos_inversion_apicultor
  ON public.proyectos_inversion(apicultor_nombre);

-- Archivos adjuntos: cotizaciones (PDF) y fotografías
CREATE TABLE IF NOT EXISTS public.proyectos_inversion_archivos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proyecto_id UUID NOT NULL REFERENCES public.proyectos_inversion(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cotizacion', 'fotografia')),
  nombre TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  tamano BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proyectos_inversion_archivos_proyecto
  ON public.proyectos_inversion_archivos(proyecto_id);

ALTER TABLE public.proyectos_inversion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos_inversion_archivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserciones anónimas" ON public.proyectos_inversion
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lecturas anónimas" ON public.proyectos_inversion
  FOR SELECT USING (true);
CREATE POLICY "Permitir actualizaciones anónimas" ON public.proyectos_inversion
  FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminaciones anónimas" ON public.proyectos_inversion
  FOR DELETE USING (true);

CREATE POLICY "Permitir inserciones anónimas" ON public.proyectos_inversion_archivos
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lecturas anónimas" ON public.proyectos_inversion_archivos
  FOR SELECT USING (true);
CREATE POLICY "Permitir actualizaciones anónimas" ON public.proyectos_inversion_archivos
  FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminaciones anónimas" ON public.proyectos_inversion_archivos
  FOR DELETE USING (true);

-- Bucket de almacenamiento para cotizaciones y fotografías
INSERT INTO storage.buckets (id, name, public)
VALUES ('proyectos-inversion', 'proyectos-inversion', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Proyectos inversion lectura" ON storage.objects
  FOR SELECT USING (bucket_id = 'proyectos-inversion');
CREATE POLICY "Proyectos inversion subida" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'proyectos-inversion');
CREATE POLICY "Proyectos inversion actualizacion" ON storage.objects
  FOR UPDATE USING (bucket_id = 'proyectos-inversion');
CREATE POLICY "Proyectos inversion eliminacion" ON storage.objects
  FOR DELETE USING (bucket_id = 'proyectos-inversion');
