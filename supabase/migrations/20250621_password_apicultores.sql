-- Migración: Password Apicultores y Observaciones Apicultores
-- Ejecutar en el SQL Editor de Supabase para agregar los campos y permisos necesarios.

-- 1. Tabla app_users (si no existe) y permisos
CREATE TABLE IF NOT EXISTS public.app_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE,
  password_hash text,
  nombre        text,
  rol           text DEFAULT 'user',
  activo        boolean DEFAULT false,
  puede_crear   boolean DEFAULT false,
  puede_editar  boolean DEFAULT false,
  puede_eliminar boolean DEFAULT false,
  puede_exportar boolean DEFAULT false,
  puede_editar_apicultores boolean DEFAULT false,
  puede_ver_acciones boolean DEFAULT false,
  puede_ver_password_apicultores boolean DEFAULT false,
  puede_editar_password_apicultores boolean DEFAULT false,
  puede_ver_observaciones_apicultores boolean DEFAULT false,
  puede_editar_observaciones_apicultores boolean DEFAULT false,
  puede_ver_observaciones_secretaria boolean DEFAULT false,
  puede_editar_observaciones_secretaria boolean DEFAULT false,
  puede_ver_observaciones_tecnico_administrativa boolean DEFAULT false,
  puede_editar_observaciones_tecnico_administrativa boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_crear boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_editar boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_eliminar boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_exportar boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_editar_apicultores boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_ver_acciones boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_ver_password_apicultores boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_editar_password_apicultores boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_ver_observaciones_apicultores boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_editar_observaciones_apicultores boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_ver_observaciones_secretaria boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_editar_observaciones_secretaria boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_ver_observaciones_tecnico_administrativa boolean DEFAULT false;

ALTER TABLE public.app_users
ADD COLUMN IF NOT EXISTS puede_editar_observaciones_tecnico_administrativa boolean DEFAULT false;

-- 2. Campos password / sipec / sii en apicultores
ALTER TABLE public.apicultores
ADD COLUMN IF NOT EXISTS password text;

ALTER TABLE public.apicultores
ADD COLUMN IF NOT EXISTS usuario_sipec text;

ALTER TABLE public.apicultores
ADD COLUMN IF NOT EXISTS contraseña_sipec text;

ALTER TABLE public.apicultores
ADD COLUMN IF NOT EXISTS contraseña_sii text;

ALTER TABLE public.apicultores
ADD COLUMN IF NOT EXISTS observaciones jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.apicultores
ADD COLUMN IF NOT EXISTS email text;

-- 3. Tabla equipo técnico
CREATE TABLE IF NOT EXISTS public.equipo_tecnico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid          uuid UNIQUE DEFAULT gen_random_uuid(),
  nombres       text,
  apellidos     text,
  nombre_completo text,
  rut           text,
  telefono      text,
  email         text,
  cargo         text,
  institucion   text,
  sync_status   text DEFAULT 'synced',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

-- 4. Políticas de RLS ya están abiertas en policies.sql.
