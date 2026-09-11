-- Permitir borrar una organización aunque algún perfil la tenga como
-- default_organization_id: en vez de bloquear el DELETE (comportamiento
-- por defecto NO ACTION), simplemente deja ese campo en NULL.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_default_organization_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_default_organization_id_fkey
  FOREIGN KEY (default_organization_id)
  REFERENCES public.organizations(id)
  ON DELETE SET NULL;
