ALTER TABLE public.proyectos_inversion
  ADD COLUMN IF NOT EXISTS aporte_valorizado BOOLEAN DEFAULT FALSE;

ALTER TABLE public.proyectos_inversion
  ADD COLUMN IF NOT EXISTS monto_valorizado BIGINT DEFAULT 0;

ALTER TABLE public.proyectos_inversion_archivos
  DROP CONSTRAINT IF EXISTS proyectos_inversion_archivos_tipo_check;

ALTER TABLE public.proyectos_inversion_archivos
  ADD CONSTRAINT proyectos_inversion_archivos_tipo_check
  CHECK (tipo IN ('cotizacion', 'fotografia', 'doc_tenencia', 'doc_dominio', 'doc_uso_suelo', 'doc_croquis', 'doc_emplazamiento'));
