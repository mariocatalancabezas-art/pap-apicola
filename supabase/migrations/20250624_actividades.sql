-- Tabla para el calendario de actividades del programa
CREATE TABLE IF NOT EXISTS public.actividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actividad TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME,
  lugar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para ordenar/buscar por fecha
CREATE INDEX IF NOT EXISTS idx_actividades_fecha ON public.actividades(fecha);

-- Política RLS para permitir operaciones
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserciones anónimas" ON public.actividades
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lecturas anónimas" ON public.actividades
  FOR SELECT USING (true);

CREATE POLICY "Permitir actualizaciones anónimas" ON public.actividades
  FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminaciones anónimas" ON public.actividades
  FOR DELETE USING (true);
