-- Agregar columnas para API key y nombre del usuario
ALTER TABLE public.profiles 
ADD COLUMN api_key TEXT,
ADD COLUMN nombre TEXT;