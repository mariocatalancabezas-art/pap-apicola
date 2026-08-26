-- Abonos y permisos adicionales del módulo Crédito Apícola

CREATE TABLE IF NOT EXISTS public.credito_abonos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id UUID NOT NULL REFERENCES public.credito_creditos(id) ON DELETE CASCADE,
  monto BIGINT NOT NULL DEFAULT 0,
  fecha DATE DEFAULT CURRENT_DATE,
  observacion TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credito_abonos_credito
  ON public.credito_abonos(credito_id);

ALTER TABLE public.credito_abonos ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.credito_abonos TO anon, authenticated;

DROP POLICY IF EXISTS "CA inserciones" ON public.credito_abonos;
CREATE POLICY "CA inserciones" ON public.credito_abonos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "CA lecturas" ON public.credito_abonos;
CREATE POLICY "CA lecturas" ON public.credito_abonos FOR SELECT USING (true);
DROP POLICY IF EXISTS "CA actualizaciones" ON public.credito_abonos;
CREATE POLICY "CA actualizaciones" ON public.credito_abonos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "CA eliminaciones" ON public.credito_abonos;
CREATE POLICY "CA eliminaciones" ON public.credito_abonos FOR DELETE USING (true);

ALTER TABLE public.credito_proveedores
  ADD COLUMN IF NOT EXISTS comuna TEXT;

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS puede_ver_credito_apicola BOOLEAN DEFAULT false;
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS puede_editar_credito_apicola BOOLEAN DEFAULT false;

UPDATE public.credito_productos
SET item_key = 'Celdas reales', nombre = 'Celdas reales'
WHERE categoria = 'Material vivo' AND item_key = 'Celdas';

UPDATE public.credito_proveedores
SET material_vivo = array_replace(material_vivo, 'Celdas', 'Celdas reales')
WHERE 'Celdas' = ANY(material_vivo);
