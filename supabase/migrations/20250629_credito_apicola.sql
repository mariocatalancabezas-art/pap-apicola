-- Módulo Crédito Apícola: proveedores, catálogo de productos/servicios y créditos

CREATE TABLE IF NOT EXISTS public.credito_proveedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  rut TEXT,
  giro TEXT,
  direccion TEXT,
  rubros TEXT[] DEFAULT '{}',
  material_vivo TEXT[] DEFAULT '{}',
  material_apicola TEXT[] DEFAULT '{}',
  material_apicola_otro TEXT,
  servicios_detalle TEXT,
  rubro_otro TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credito_productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proveedor_id UUID NOT NULL REFERENCES public.credito_proveedores(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  item_key TEXT NOT NULL,
  nombre TEXT NOT NULL,
  detalle TEXT,
  valor_neto BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (proveedor_id, categoria, item_key)
);

CREATE INDEX IF NOT EXISTS idx_credito_productos_proveedor
  ON public.credito_productos(proveedor_id);

CREATE TABLE IF NOT EXISTS public.credito_creditos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiario_nombre TEXT NOT NULL,
  beneficiario_rut TEXT,
  beneficiario_telefono TEXT,
  beneficiario_direccion TEXT,
  beneficiario_comuna TEXT,
  es_apicultor_programa BOOLEAN DEFAULT TRUE,
  fecha_entrega_productos DATE,
  fecha_limite_pago DATE,
  representante_nombre TEXT,
  representante_rut TEXT,
  total_neto BIGINT DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'miel_entregada')),
  fecha_cumplimiento DATE,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credito_creditos_estado
  ON public.credito_creditos(estado, fecha_limite_pago);

CREATE TABLE IF NOT EXISTS public.credito_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id UUID NOT NULL REFERENCES public.credito_creditos(id) ON DELETE CASCADE,
  orden INTEGER DEFAULT 0,
  proveedor_id UUID REFERENCES public.credito_proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT,
  producto_id UUID REFERENCES public.credito_productos(id) ON DELETE SET NULL,
  producto_nombre TEXT,
  cantidad NUMERIC DEFAULT 1,
  valor_neto BIGINT DEFAULT 0,
  total_neto BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credito_items_credito
  ON public.credito_items(credito_id);

ALTER TABLE public.credito_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credito_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credito_creditos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credito_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CP inserciones" ON public.credito_proveedores FOR INSERT WITH CHECK (true);
CREATE POLICY "CP lecturas" ON public.credito_proveedores FOR SELECT USING (true);
CREATE POLICY "CP actualizaciones" ON public.credito_proveedores FOR UPDATE USING (true);
CREATE POLICY "CP eliminaciones" ON public.credito_proveedores FOR DELETE USING (true);

CREATE POLICY "CPR inserciones" ON public.credito_productos FOR INSERT WITH CHECK (true);
CREATE POLICY "CPR lecturas" ON public.credito_productos FOR SELECT USING (true);
CREATE POLICY "CPR actualizaciones" ON public.credito_productos FOR UPDATE USING (true);
CREATE POLICY "CPR eliminaciones" ON public.credito_productos FOR DELETE USING (true);

CREATE POLICY "CC inserciones" ON public.credito_creditos FOR INSERT WITH CHECK (true);
CREATE POLICY "CC lecturas" ON public.credito_creditos FOR SELECT USING (true);
CREATE POLICY "CC actualizaciones" ON public.credito_creditos FOR UPDATE USING (true);
CREATE POLICY "CC eliminaciones" ON public.credito_creditos FOR DELETE USING (true);

CREATE POLICY "CI inserciones" ON public.credito_items FOR INSERT WITH CHECK (true);
CREATE POLICY "CI lecturas" ON public.credito_items FOR SELECT USING (true);
CREATE POLICY "CI actualizaciones" ON public.credito_items FOR UPDATE USING (true);
CREATE POLICY "CI eliminaciones" ON public.credito_items FOR DELETE USING (true);
