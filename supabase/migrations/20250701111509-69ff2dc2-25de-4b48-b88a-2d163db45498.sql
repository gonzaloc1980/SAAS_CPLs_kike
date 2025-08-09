
-- Crear tabla para formularios de contacto
CREATE TABLE public.contact_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  mensaje TEXT,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Contactado', 'Cerrado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Hacer la tabla pública (sin RLS) para que cualquier persona pueda enviar solicitudes
-- No habilitamos RLS porque queremos que cualquiera pueda enviar una solicitud de contacto

-- Crear política para permitir que cualquiera inserte solicitudes de contacto
CREATE POLICY "Anyone can create contact requests" 
  ON public.contact_requests 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Solo usuarios autenticados (admin) pueden ver las solicitudes
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only authenticated users can view contact requests" 
  ON public.contact_requests 
  FOR SELECT 
  TO authenticated
  USING (true);
