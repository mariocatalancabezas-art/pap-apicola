-- Preguntas ASB (respuestas Sí/No y campo asociado) para el diagnóstico.
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS asb_nos_entrego_miel TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS asb_sala_autorizada TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS asb_sala_pronta_autorizar TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS asb_que_le_falta TEXT;
