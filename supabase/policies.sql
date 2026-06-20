-- Políticas de seguridad para sincronización anónima (anon key) en PAP Apícola
-- Ejecutar esto en el SQL Editor de Supabase para permitir que todos los dispositivos
-- sincronicen apicultores, visitas, diagnósticos y cualquier tabla futura.

-- ==========================================
-- APICULTORES
-- ==========================================

ALTER TABLE IF EXISTS public.apicultores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous all operations on apicultores" ON public.apicultores;

CREATE POLICY "Allow anonymous all operations on apicultores"
ON public.apicultores
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ==========================================
-- VISITAS / DIAGNÓSTICOS
-- ==========================================

ALTER TABLE IF EXISTS public.visitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous all operations on visitas" ON public.visitas;

CREATE POLICY "Allow anonymous all operations on visitas"
ON public.visitas
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ==========================================
-- USUARIOS DE LA APP (custom auth)
-- ==========================================

ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous all operations on app_users" ON public.app_users;

CREATE POLICY "Allow anonymous all operations on app_users"
ON public.app_users
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- ==========================================
-- PLANTILLA PARA NUEVAS TABLAS
-- ==========================================
-- Cuando crees una nueva tabla en el futuro, ejecuta este bloque reemplazando
-- NOMBRE_TABLA por el nombre real:

/*
ALTER TABLE IF EXISTS public.NOMBRE_TABLA ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous all operations on NOMBRE_TABLA" ON public.NOMBRE_TABLA;

CREATE POLICY "Allow anonymous all operations on NOMBRE_TABLA"
ON public.NOMBRE_TABLA
FOR ALL
TO anon
USING (true)
WITH CHECK (true);
*/
