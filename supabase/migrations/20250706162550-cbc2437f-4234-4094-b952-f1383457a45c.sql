-- Actualizar la restricción check de la tabla grupos para permitir el estado 'Creando...'
ALTER TABLE public.grupos DROP CONSTRAINT grupos_estado_check;

-- Agregar la nueva restricción que incluye 'Creando...'
ALTER TABLE public.grupos ADD CONSTRAINT grupos_estado_check 
CHECK (estado IN ('No creado', 'Creando...', 'Creado'));