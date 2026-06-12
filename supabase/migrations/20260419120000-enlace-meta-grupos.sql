-- Add Meta Ads link columns to grupos table
ALTER TABLE grupos
  ADD COLUMN IF NOT EXISTS identificador_meta TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS mensaje_bienvenida TEXT,
  ADD COLUMN IF NOT EXISTS enlace_invitacion TEXT;

-- Index for fast lookup when the auto-reply webhook fires
CREATE INDEX IF NOT EXISTS grupos_identificador_meta_idx
  ON grupos (identificador_meta)
  WHERE identificador_meta IS NOT NULL;
