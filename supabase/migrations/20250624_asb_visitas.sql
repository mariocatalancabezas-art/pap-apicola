-- Preguntas ASB: persistir junto al diagnóstico (antes solo se guardaban localmente)
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS asb_anios_apicultura TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS asb_motivacion TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS asb_talleres_interes TEXT;
