-- ============================================================
-- Finus — Migración 003: Líneas de crédito
-- Fecha: Abril 2026
-- Ejecutar en Supabase SQL Editor
--
-- Reemplaza el modelo de tarjetas+compromisos revolventes por
-- un modelo explícito de líneas de crédito con desglose de cargos
-- y registro de pagos históricos.
--
-- Prerequisitos: migrations 001 y 002 ya aplicadas
-- (tablas usuarios, cuentas, tarjetas, compromisos, transacciones)
-- ============================================================

-- ── 1. ENUMs ─────────────────────────────────────────────────

CREATE TYPE tipo_linea_credito AS ENUM (
  'tarjeta_credito',
  'linea_digital',
  'bnpl',
  'departamental'
);

CREATE TYPE tipo_cargo AS ENUM (
  'revolvente',
  'msi',
  'disposicion_efectivo'
);

CREATE TYPE tipo_pago_linea AS ENUM (
  'minimo',
  'sin_intereses',
  'parcial',
  'total'
);

-- ── 2. TABLA: lineas_credito ──────────────────────────────────
-- Reemplaza conceptualmente a `tarjetas`.
-- El pago es siempre global contra la línea (no por cargo individual).
-- tasa_interes_anual — dividir /12 para cálculos mensuales.
-- ⚠️ activa (femenino), igual que cuentas y tarjetas
-- ⚠️ NO modificar saldo_actual directamente — usar RPC decrementar_saldo_linea
CREATE TABLE lineas_credito (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID               NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                TEXT               NOT NULL,
  banco                 TEXT,
  tipo                  tipo_linea_credito NOT NULL,
  titular_tipo          TEXT               NOT NULL DEFAULT 'personal',
  titular_nombre        TEXT,
  ultimos_4             TEXT,
  limite_credito        NUMERIC,
  saldo_actual          NUMERIC            NOT NULL DEFAULT 0,
  saldo_al_corte        NUMERIC,
  pago_sin_intereses    NUMERIC,
  pago_minimo           NUMERIC,
  fecha_proximo_pago    DATE,
  dia_corte             INT,
  dia_limite_pago       INT,
  tasa_interes_anual    NUMERIC,
  activa                BOOLEAN            NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ── 3. TABLA: cargos_linea ────────────────────────────────────
-- Desglose interno de cada línea (informativo, no determina el pago).
-- Para revolvente: un solo cargo activo por línea; saldo_pendiente
--   se actualiza manualmente cada corte.
-- Para MSI: activo=false cuando mensualidades_restantes llega a 0,
--   NO se elimina el registro.
-- ⚠️ activo (masculino), igual que compromisos y gastos_previstos
CREATE TABLE cargos_linea (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_credito_id        UUID        NOT NULL REFERENCES lineas_credito(id) ON DELETE CASCADE,
  usuario_id              UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                  TEXT        NOT NULL,
  tipo                    tipo_cargo  NOT NULL,
  monto_original          NUMERIC     NOT NULL,
  monto_mensualidad       NUMERIC,                  -- MSI: cuota mensual
  mensualidades_totales   INT,                      -- MSI: total de meses
  mensualidades_restantes INT,                      -- MSI: quedan N pagos
  saldo_pendiente         NUMERIC     NOT NULL,     -- revolvente: saldo actual
  tasa_efectiva_anual     NUMERIC     DEFAULT 0,
  notas                   TEXT,
  activo                  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. TABLA: pagos_linea ─────────────────────────────────────
-- Historial inmutable de pagos reales hechos contra una línea.
-- Sin updated_at — los pagos no se editan.
CREATE TABLE pagos_linea (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_credito_id  UUID            NOT NULL REFERENCES lineas_credito(id) ON DELETE CASCADE,
  usuario_id        UUID            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha             DATE            NOT NULL DEFAULT CURRENT_DATE,
  monto_pagado      NUMERIC         NOT NULL,
  tipo_pago         tipo_pago_linea NOT NULL DEFAULT 'parcial',
  cuenta_origen_id  UUID            REFERENCES cuentas(id),
  notas             TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── 5. ÍNDICES ───────────────────────────────────────────────
CREATE INDEX idx_lineas_usuario   ON lineas_credito(usuario_id);
CREATE INDEX idx_lineas_activa    ON lineas_credito(usuario_id, activa);

CREATE INDEX idx_cargos_linea     ON cargos_linea(linea_credito_id);
CREATE INDEX idx_cargos_usuario   ON cargos_linea(usuario_id);
CREATE INDEX idx_cargos_activo    ON cargos_linea(linea_credito_id, activo);

CREATE INDEX idx_pagos_linea      ON pagos_linea(linea_credito_id);
CREATE INDEX idx_pagos_usuario    ON pagos_linea(usuario_id);
CREATE INDEX idx_pagos_fecha      ON pagos_linea(linea_credito_id, fecha);

-- ── 6. RLS (Row Level Security) ──────────────────────────────
ALTER TABLE lineas_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos_linea   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_linea    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lineas_credito: usuario ve las suyas"
  ON lineas_credito FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "cargos_linea: usuario ve los suyos"
  ON cargos_linea FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "pagos_linea: usuario ve los suyos"
  ON pagos_linea FOR ALL
  USING (auth.uid() = usuario_id);

-- ── 7. TRIGGERS: updated_at automático ──────────────────────
-- set_updated_at() ya existe desde migraciones anteriores.
CREATE TRIGGER trg_lineas_updated_at
  BEFORE UPDATE ON lineas_credito
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cargos_updated_at
  BEFORE UPDATE ON cargos_linea
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- pagos_linea no tiene updated_at — sin trigger

-- ── 8. RPC: decrementar_saldo_linea ─────────────────────────
-- Atómico: evita race conditions y saldos negativos.
-- Equivalente a decrementar_saldo para cuentas.
-- Llamar siempre desde registrarPagoLinea en lugar de UPDATE directo.
CREATE OR REPLACE FUNCTION decrementar_saldo_linea(p_linea_id UUID, p_monto NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE lineas_credito
  SET saldo_actual = GREATEST(0, saldo_actual - p_monto),
      updated_at   = NOW()
  WHERE id = p_linea_id;
END;
$$;

-- ── 9. RPC: calcular_pago_sugerido_linea ─────────────────────
-- Devuelve el pago mínimo sugerido para una línea:
--   suma de mensualidades MSI activas (obligatorias)
--   + saldo revolvente activo.
-- La lógica de recommendations.ts decide cuánto del revolvente
-- recomendar pagar según saldo disponible del usuario.
CREATE OR REPLACE FUNCTION calcular_pago_sugerido_linea(p_linea_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msi_total  NUMERIC;
  v_revolvente NUMERIC;
BEGIN
  SELECT COALESCE(SUM(monto_mensualidad), 0) INTO v_msi_total
  FROM cargos_linea
  WHERE linea_credito_id = p_linea_id
    AND tipo   = 'msi'
    AND activo = TRUE;

  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_revolvente
  FROM cargos_linea
  WHERE linea_credito_id = p_linea_id
    AND tipo   = 'revolvente'
    AND activo = TRUE;

  RETURN v_msi_total + v_revolvente;
END;
$$;
