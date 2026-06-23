-- Tabla para solicitudes de recuperación de contraseña
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  codigo TEXT NOT NULL,
  expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
  utilizado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON public.password_reset_requests(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codigo ON public.password_reset_requests(codigo);
CREATE INDEX IF NOT EXISTS idx_password_reset_expiracion ON public.password_reset_requests(expiracion);

-- Política RLS para permitir operaciones
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserciones anónimas" ON public.password_reset_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir lecturas anónimas" ON public.password_reset_requests
  FOR SELECT USING (true);

CREATE POLICY "Permitir actualizaciones anónimas" ON public.password_reset_requests
  FOR UPDATE USING (true);
