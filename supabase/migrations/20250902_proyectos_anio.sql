ALTER TABLE public.proyectos_inversion ADD COLUMN IF NOT EXISTS anio INTEGER;
UPDATE public.proyectos_inversion SET anio = 2026 WHERE anio IS NULL;
ALTER TABLE public.proyectos_inversion ALTER COLUMN anio SET DEFAULT 2026;
CREATE INDEX IF NOT EXISTS idx_proyectos_inversion_anio ON public.proyectos_inversion(anio);
