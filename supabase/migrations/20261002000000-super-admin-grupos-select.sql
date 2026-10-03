-- El panel de Monitoreo (super_admin) necesita leer grupos de TODAS las
-- organizaciones para mostrar el nombre del grupo destinatario de cada CPL.
-- Falta esta politica (ya existe la equivalente en cpls y organizations).
CREATE POLICY "Super admins can view all grupos"
ON public.grupos
FOR SELECT
USING (public.is_super_admin(auth.uid()));
