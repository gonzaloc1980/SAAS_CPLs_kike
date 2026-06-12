-- Crear tabla cpls_lanzamientos
-- Tabla independiente para CPLs programados por día del mes (recurrente) o fecha específica (fecha_unica)

CREATE TABLE public.cpls_lanzamientos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Tipo de programación
  tipo_lanzamiento TEXT NOT NULL CHECK (tipo_lanzamiento IN ('recurrente', 'fecha_unica')),

  -- Scheduling: día del mes (1-31) para recurrente
  dia_mes INTEGER CHECK (dia_mes BETWEEN 1 AND 31),

  -- Scheduling: fecha específica para fecha_unica
  fecha_lanzamiento DATE,

  -- Rango de vigencia (solo aplica para recurrente)
  fecha_inicio DATE,
  fecha_termino DATE,

  -- Hora de envío
  hora TIME NOT NULL,
  hora_colombia TIME,
  admin_cpl_pais TEXT,

  -- Tipo y contenido del CPL (igual que en cpls)
  tipo_cpl TEXT[] NOT NULL,
  mensaje_x_dia TEXT,
  youtube_url TEXT,
  texto_video TEXT,
  imagen_url TEXT,
  imagen_texto TEXT,
  audio_url TEXT,
  audio_texto TEXT,

  -- Destinatario
  destinatario_persona_grupo TEXT,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado')),

  -- Relaciones
  user_id UUID REFERENCES auth.users NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Constraint: asegurar que los campos correctos estén presentes según el tipo
  CONSTRAINT check_tipo_lanzamiento CHECK (
    (tipo_lanzamiento = 'recurrente' AND dia_mes IS NOT NULL) OR
    (tipo_lanzamiento = 'fecha_unica' AND fecha_lanzamiento IS NOT NULL)
  )
);

-- Habilitar RLS
ALTER TABLE public.cpls_lanzamientos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mismo patrón que cpls)
CREATE POLICY "Users can view their own cpls_lanzamientos"
  ON public.cpls_lanzamientos
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cpls_lanzamientos"
  ON public.cpls_lanzamientos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cpls_lanzamientos"
  ON public.cpls_lanzamientos
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cpls_lanzamientos"
  ON public.cpls_lanzamientos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_cpls_lanzamientos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cpls_lanzamientos_updated_at
  BEFORE UPDATE ON public.cpls_lanzamientos
  FOR EACH ROW EXECUTE FUNCTION update_cpls_lanzamientos_updated_at();
