ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_ver_proyectos_inversion BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_editar_proyectos_inversion BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS puede_eliminar_proyectos_inversion BOOLEAN DEFAULT false;
