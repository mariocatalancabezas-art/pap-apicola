CREATE TABLE IF NOT EXISTS public.visita_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uuid UUID NOT NULL UNIQUE,
  visita_uuid UUID NOT NULL,
  nombre TEXT,
  path TEXT NOT NULL,
  mime_type TEXT,
  tamano BIGINT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_visita_fotos_visita ON public.visita_fotos(visita_uuid);

ALTER TABLE public.visita_fotos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.visita_fotos TO anon, authenticated;

DROP POLICY IF EXISTS "VF inserciones" ON public.visita_fotos;
CREATE POLICY "VF inserciones" ON public.visita_fotos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "VF lecturas" ON public.visita_fotos;
CREATE POLICY "VF lecturas" ON public.visita_fotos FOR SELECT USING (true);
DROP POLICY IF EXISTS "VF actualizaciones" ON public.visita_fotos;
CREATE POLICY "VF actualizaciones" ON public.visita_fotos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "VF eliminaciones" ON public.visita_fotos;
CREATE POLICY "VF eliminaciones" ON public.visita_fotos FOR DELETE USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('visitas-fotos', 'visitas-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Visitas fotos lectura" ON storage.objects;
CREATE POLICY "Visitas fotos lectura" ON storage.objects FOR SELECT USING (bucket_id = 'visitas-fotos');
DROP POLICY IF EXISTS "Visitas fotos subida" ON storage.objects;
CREATE POLICY "Visitas fotos subida" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'visitas-fotos');
DROP POLICY IF EXISTS "Visitas fotos actualizacion" ON storage.objects;
CREATE POLICY "Visitas fotos actualizacion" ON storage.objects FOR UPDATE USING (bucket_id = 'visitas-fotos');
DROP POLICY IF EXISTS "Visitas fotos eliminacion" ON storage.objects;
CREATE POLICY "Visitas fotos eliminacion" ON storage.objects FOR DELETE USING (bucket_id = 'visitas-fotos');
