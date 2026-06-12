-- Permite lectura pública (anon) en grupos solo para la landing page /join/:id
-- Solo expone nombre y enlace_invitacion cuando el grupo tiene identificador_meta
CREATE POLICY "public can read grupos by identificador_meta"
  ON grupos
  FOR SELECT
  TO anon
  USING (identificador_meta IS NOT NULL);
