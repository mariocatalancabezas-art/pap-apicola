-- Visita Administrativa: distinguir tipo de visita y campos de la planilla (acta)
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS tipo_visita TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_nombre_tecnico TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_fecha_visita TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_tema_principal TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_tema_otro TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_observaciones TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_acuerdos TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_firma_asesor TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS va_firma_usuario TEXT;
