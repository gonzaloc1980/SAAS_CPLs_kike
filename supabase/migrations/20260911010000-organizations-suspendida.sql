-- Bandera de suspensión por falta de pago. El flujo de envío de n8n revisa
-- este campo (vía get_organizationID1/2/3/4, que ya traen la fila completa
-- de organizations) y salta el envío si está en true, sin depender de que
-- Evolution API "desconecte" la instancia de forma confiable.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS suspendida BOOLEAN NOT NULL DEFAULT false;
