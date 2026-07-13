ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_editar_calendario BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_eliminar_calendario BOOLEAN DEFAULT false;
