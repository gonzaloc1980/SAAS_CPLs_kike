
-- Crear tabla grupos
CREATE TABLE public.grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  id_grupo TEXT, -- generado automáticamente por proceso externo
  estado TEXT NOT NULL DEFAULT 'No creado' CHECK (estado IN ('No creado', 'Creado')),
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla CPLs
CREATE TABLE public.cpls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha_inicio DATE NOT NULL,
  fecha_termino DATE NOT NULL,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
  hora TIME NOT NULL,
  tipo_cpl TEXT[] NOT NULL, -- array que permite múltiples tipos: texto, video, imagen, audio
  mensaje_x_dia TEXT, -- editor de texto enriquecido
  youtube_url TEXT,
  texto_video TEXT,
  imagen_url TEXT,
  imagen_texto TEXT,
  audio_url TEXT,
  audio_texto TEXT,
  destinatario_persona_grupo TEXT, -- se guarda el id_grupo
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en ambas tablas
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpls ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para grupos - usuarios solo pueden ver/editar sus propios grupos
CREATE POLICY "Users can view their own grupos" 
  ON public.grupos 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own grupos" 
  ON public.grupos 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grupos" 
  ON public.grupos 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grupos" 
  ON public.grupos 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Políticas RLS para CPLs - usuarios solo pueden ver/editar sus propios CPLs
CREATE POLICY "Users can view their own cpls" 
  ON public.cpls 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cpls" 
  ON public.cpls 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cpls" 
  ON public.cpls 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cpls" 
  ON public.cpls 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Crear buckets de almacenamiento para imágenes y audios
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('audios', 'audios', true);

-- Políticas de almacenamiento - usuarios autenticados pueden subir archivos
CREATE POLICY "Authenticated users can upload images" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Anyone can view images" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'images');

CREATE POLICY "Users can update their own images" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'images');

CREATE POLICY "Users can delete their own images" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload audios" 
  ON storage.objects 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Anyone can view audios" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'audios');

CREATE POLICY "Users can update their own audios" 
  ON storage.objects 
  FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'audios');

CREATE POLICY "Users can delete their own audios" 
  ON storage.objects 
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'audios');
