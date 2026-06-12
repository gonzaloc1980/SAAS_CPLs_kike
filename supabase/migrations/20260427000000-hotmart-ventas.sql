-- Tabla para almacenar las ventas scrapeadas de Hotmart
CREATE TABLE public.hotmart_ventas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificación de la transacción
  transaction_code TEXT,

  -- Datos del comprador
  buyer_name TEXT,
  buyer_email TEXT,

  -- Datos del producto
  product_name TEXT,

  -- Fechas
  purchase_date TIMESTAMP WITH TIME ZONE,
  fecha_compra_raw TEXT,           -- Fecha tal como aparece en la UI (DD/MM/YYYY)

  -- Estado y valor
  status TEXT,
  value_raw TEXT,                  -- Valor tal como aparece en la UI

  -- Datos completos (JSON con todo lo scrapeado)
  raw_data JSONB,

  -- Control
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_hotmart_ventas_purchase_date ON public.hotmart_ventas (purchase_date);
CREATE INDEX idx_hotmart_ventas_buyer_email ON public.hotmart_ventas (buyer_email);
CREATE INDEX idx_hotmart_ventas_transaction_code ON public.hotmart_ventas (transaction_code);

-- RLS: solo super_admin puede ver/gestionar estos datos
ALTER TABLE public.hotmart_ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage hotmart_ventas"
  ON public.hotmart_ventas
  FOR ALL
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_hotmart_ventas_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hotmart_ventas_updated_at
  BEFORE UPDATE ON public.hotmart_ventas
  FOR EACH ROW EXECUTE FUNCTION public.update_hotmart_ventas_updated_at();
