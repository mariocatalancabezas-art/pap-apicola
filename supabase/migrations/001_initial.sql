-- Tabla de apicultores
CREATE TABLE IF NOT EXISTS apicultores (
  uuid          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  nif           TEXT,
  telefono      TEXT,
  email         TEXT,
  direccion     TEXT,
  municipio     TEXT,
  provincia     TEXT,
  codigo_postal TEXT,
  num_colmenas  INTEGER DEFAULT 0,
  notas         TEXT,
  sync_status   TEXT DEFAULT 'synced',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Tabla de visitas
CREATE TABLE IF NOT EXISTS visitas (
  uuid                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apicultor_id          UUID REFERENCES apicultores(uuid) ON DELETE SET NULL,
  fecha                 DATE NOT NULL,
  tipo_visita           TEXT,
  colmenas_revisadas    INTEGER DEFAULT 0,
  colmenas_produccion   INTEGER DEFAULT 0,
  condiciones_climaticas TEXT,
  presencia_reina       TEXT,
  enfermedades          TEXT,
  tratamiento           TEXT,
  observaciones         TEXT,
  proxima_visita        DATE,
  sync_status           TEXT DEFAULT 'synced',
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_visitas_apicultor ON visitas(apicultor_id);
CREATE INDEX IF NOT EXISTS idx_visitas_fecha ON visitas(fecha);
CREATE INDEX IF NOT EXISTS idx_apicultores_updated ON apicultores(updated_at);
CREATE INDEX IF NOT EXISTS idx_visitas_updated ON visitas(updated_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apicultores_updated_at
  BEFORE UPDATE ON apicultores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER visitas_updated_at
  BEFORE UPDATE ON visitas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS) - activar según necesidades de autenticación
-- ALTER TABLE apicultores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;
