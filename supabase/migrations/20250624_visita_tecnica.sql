-- Visita Técnica Apícola: campos de la planilla técnica
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_nombre_tecnico TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_fecha_visita TEXT;
-- Datos del Apiario
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_nombre_apiario TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_num_colmenas TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_actividad_principal TEXT;
-- Condición Sanitaria
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_varroa_pct TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_enfermedades TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_tratamientos TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_fecha_ultimo_tratamiento TEXT;
-- Producción
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_prod_anterior TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_prod_estimada TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_tipo_miel TEXT;
-- Manejo Técnico
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_alimentacion TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_renovacion_reinas TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_recambio_marcos TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_calendario_manejo TEXT;
-- Observaciones de la Visita
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_problemas TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_recomendaciones TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_compromisos TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_fecha_proxima_visita TEXT;
-- Informe
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_informe TEXT;
-- Firmas
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_firma_tecnico TEXT;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS vt_firma_apicultor TEXT;
