-- ============================================================
-- Finus — Migración: proyectos y proyecto_proveedores
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. ENUM: estado de proyecto ─────────────────────────────
CREATE TYPE estado_proyecto AS ENUM (
  'planeando',
  'en_curso',
  'completado',
  'cancelado'
);

-- ── 2. ENUM: estado de proveedor ────────────────────────────
CREATE TYPE estado_proveedor AS ENUM (
  'sin_anticipo',
  'anticipo_pagado',
  'abonando',
  'liquidado',
  'cancelado'
);

-- ── 3. TABLA: proyectos ──────────────────────────────────────
CREATE TABLE proyectos (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                TEXT NOT NULL,
  descripcion           TEXT,
  fecha_evento          DATE,
  -- Campos calculados — NO actualizar directamente, usar RPC recalcular_proyecto
  total_comprometido    NUMERIC NOT NULL DEFAULT 0,
  total_abonado         NUMERIC NOT NULL DEFAULT 0,
  total_pendiente       NUMERIC NOT NULL DEFAULT 0,
  -- Opcional: techo autoimpuesto por el usuario
  techo_gasto           NUMERIC,
  estado                estado_proyecto NOT NULL DEFAULT 'planeando',
  activo                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. TABLA: proyecto_proveedores ───────────────────────────
CREATE TABLE proyecto_proveedores (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id               UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  usuario_id                UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                    TEXT NOT NULL,
  categoria                 TEXT,  -- 'local', 'fotografía', 'vestido', 'maquillaje', 'música', etc.
  monto_total               NUMERIC NOT NULL,
  anticipo_requerido        NUMERIC,
  fecha_anticipo            DATE,
  fecha_limite_liquidacion  DATE NOT NULL,
  -- Campos calculados — NO actualizar directamente, usar RPC recalcular_proyecto
  monto_abonado             NUMERIC NOT NULL DEFAULT 0,
  monto_pendiente           NUMERIC NOT NULL DEFAULT 0,
  estado                    estado_proveedor NOT NULL DEFAULT 'sin_anticipo',
  notas                     TEXT,
  activo                    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. COLUMNA NUEVA en transacciones ───────────────────────
-- Permite registrar abonos a proveedores como transacciones normales
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS proyecto_proveedor_id UUID REFERENCES proyecto_proveedores(id);

-- ── 6. ÍNDICES ───────────────────────────────────────────────
CREATE INDEX idx_proyectos_usuario       ON proyectos(usuario_id);
CREATE INDEX idx_proyectos_activo        ON proyectos(usuario_id, activo);
CREATE INDEX idx_proveedores_proyecto    ON proyecto_proveedores(proyecto_id);
CREATE INDEX idx_proveedores_usuario     ON proyecto_proveedores(usuario_id);
CREATE INDEX idx_transacciones_proveedor ON transacciones(proyecto_proveedor_id);

-- ── 7. RLS (Row Level Security) ──────────────────────────────
ALTER TABLE proyectos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_proveedores ENABLE ROW LEVEL SECURITY;

-- Políticas: cada usuario solo ve y modifica sus propios registros
CREATE POLICY "proyectos: usuario ve los suyos"
  ON proyectos FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "proveedores: usuario ve los suyos"
  ON proyecto_proveedores FOR ALL
  USING (auth.uid() = usuario_id);

-- ── 8. TRIGGER: updated_at automático ───────────────────────
-- Reutiliza la función que ya debe existir en el proyecto
-- Si no existe, crearla primero:
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_proyectos_updated_at
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON proyecto_proveedores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 9. RPC: recalcular_proyecto ──────────────────────────────
-- Recalcula todos los totales del proyecto y sus proveedores
-- Llamar después de cualquier insert/update/delete de abonos
CREATE OR REPLACE FUNCTION recalcular_proyecto(p_proyecto_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proveedor RECORD;
  v_abonado   NUMERIC;
BEGIN
  -- Recalcular monto_abonado y monto_pendiente por proveedor
  FOR v_proveedor IN
    SELECT id, monto_total
    FROM proyecto_proveedores
    WHERE proyecto_id = p_proyecto_id AND activo = TRUE
  LOOP
    SELECT COALESCE(SUM(monto), 0) INTO v_abonado
    FROM transacciones
    WHERE proyecto_proveedor_id = v_proveedor.id;

    UPDATE proyecto_proveedores SET
      monto_abonado   = v_abonado,
      monto_pendiente = v_proveedor.monto_total - v_abonado,
      estado = CASE
        WHEN v_abonado = 0 THEN 'sin_anticipo'
        WHEN v_abonado >= v_proveedor.monto_total THEN 'liquidado'
        ELSE 'abonando'
      END,
      updated_at = NOW()
    WHERE id = v_proveedor.id;
  END LOOP;

  -- Recalcular totales del proyecto
  UPDATE proyectos SET
    total_comprometido = (
      SELECT COALESCE(SUM(monto_total), 0)
      FROM proyecto_proveedores
      WHERE proyecto_id = p_proyecto_id AND activo = TRUE
    ),
    total_abonado = (
      SELECT COALESCE(SUM(monto_abonado), 0)
      FROM proyecto_proveedores
      WHERE proyecto_id = p_proyecto_id AND activo = TRUE
    ),
    total_pendiente = (
      SELECT COALESCE(SUM(monto_pendiente), 0)
      FROM proyecto_proveedores
      WHERE proyecto_id = p_proyecto_id AND activo = TRUE
    ),
    updated_at = NOW()
  WHERE id = p_proyecto_id;
END;
$$;
