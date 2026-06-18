-- Agregar columna puede_editar_apicultores a la tabla app_users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS puede_editar_apicultores BOOLEAN DEFAULT FALSE;

-- Actualizar el usuario administrador para que tenga todos los permisos
UPDATE app_users 
SET puede_editar_apicultores = TRUE 
WHERE rol = 'admin' OR email = 'mariocatalancabezas@gmail.com';
