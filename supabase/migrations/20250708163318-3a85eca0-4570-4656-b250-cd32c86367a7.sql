-- Agregar columna para números de WhatsApp en la tabla grupos
ALTER TABLE public.grupos 
ADD COLUMN numeros_whatsapp TEXT[] NOT NULL DEFAULT '{}';

-- Agregar comentario para documentar la columna
COMMENT ON COLUMN public.grupos.numeros_whatsapp IS 'Array de números de WhatsApp para formar el grupo (mínimo 1 número requerido)';