-- ============================================================
-- Finus — Migración: presupuesto_operativo + campos granulares
-- en transacciones (subcategoria, momento_del_dia, etiquetas)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ── 1. NUEVAS COLUMNAS en transacciones ─────────────────────
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS subcategoria TEXT,
  ADD COLUMN IF NOT EXISTS momento_del_dia TEXT
    CHECK (momento_del_dia IN ('desayuno', 'almuerzo', 'cena', 'snack', 'sin_clasificar')),
  ADD COLUMN IF NOT EXISTS etiquetas TEXT[] DEFAULT '{}';

-- ── 2. ENUMS nuevos ──────────────────────────────────────────
CREATE TYPE frecuencia_presupuesto AS ENUM (
  'diario',
  'semanal',
  'quincenal',
  'mensual'
);

CREATE TYPE confianza_presupuesto AS ENUM (
  'baja',
  'media',
  'alta'
);

CREATE TYPE fuente_presupuesto AS ENUM (
  'manual',
  'aprendido'
);

-- ── 3. TABLA: presupuesto_operativo ──────────────────────────
-- Cada fila representa una partida de gasto básico del usuario.
-- Arranca con datos manuales (día 0 sin historial) y evoluciona
-- hacia datos aprendidos del historial de transacciones.
CREATE TABLE presupuesto_operativo (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Clasificación
  categoria             TEXT NOT NULL,   -- 'comida', 'gasolina', 'despensa', 'snacks', etc.
  subcategoria          TEXT,            -- 'restaurante', 'cocina_propia', 'lleno', etc.

  -- Periodicidad
  frecuencia            frecuencia_presupuesto NOT NULL DEFAULT 'semanal',

  -- Montos: manual (siempre presente) y aprendido (calculado del historial)
  monto_manual          NUMERIC,
  monto_aprendido       NUMERIC,         -- promedio últimas 8 semanas de transacciones

  -- Cuál fuente usa Finus para calcular la reserva
  fuente_activa         fuente_presupuesto NOT NULL DEFAULT 'manual',

  -- Nivel de confianza basado en semanas_de_datos
  -- baja (0-3 sem): usa monto_manual + 20% margen
  -- media (4-7 sem): usa monto_manual sin margen
  -- alta (8+ sem):  usa monto_aprendido si fuente_activa = 'aprendido'
  confianza             confianza_presupuesto NOT NULL DEFAULT 'baja',
  semanas_de_datos      INT NOT NULL DEFAULT 0,

  -- Sugerencias de actualización
  -- Finus marca sugerencia_pendiente = TRUE cuando detecta
  -- desviación >15% sostenida por 4+ semanas consecutivas
  sugerencia_pendiente  BOOLEAN NOT NULL DEFAULT FALSE,
  monto_sugerido        NUMERIC,         -- el nuevo monto que Finus propone
  veces_ignorada        INT NOT NULL DEFAULT 0,  -- al llegar a 3 se deja de sugerir

  activo                BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. ÍNDICES ───────────────────────────────────────────────
CREATE INDEX idx_presupuesto_usuario
  ON presupuesto_operativo(usuario_id);

CREATE INDEX idx_presupuesto_usuario_activo
  ON presupuesto_operativo(usuario_id, activo);

CREATE INDEX idx_transacciones_subcategoria
  ON transacciones(usuario_id, categoria, subcategoria);

CREATE INDEX idx_transacciones_momento
  ON transacciones(usuario_id, momento_del_dia)
  WHERE momento_del_dia IS NOT NULL;

-- ── 5. RLS ───────────────────────────────────────────────────
ALTER TABLE presupuesto_operativo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presupuesto: usuario ve los suyos"
  ON presupuesto_operativo FOR ALL
  USING (auth.uid() = usuario_id);

-- ── 6. TRIGGER updated_at ────────────────────────────────────
-- Reutiliza set_updated_at() que ya existe en el proyecto
CREATE TRIGGER trg_presupuesto_updated_at
  BEFORE UPDATE ON presupuesto_operativo
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. RPC: calcular_reserva_operativa ───────────────────────
-- Devuelve el monto a reservar para los próximos p_dias días.
-- Considera frecuencia de cada partida, fuente activa y margen
-- de confianza. Llamar desde el dashboard para obtener saldoLibre.
CREATE OR REPLACE FUNCTION calcular_reserva_operativa(
  p_usuario_id UUID,
  p_dias       INT
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total   NUMERIC := 0;
  v_partida RECORD;
  v_monto   NUMERIC;
  v_margen  NUMERIC;
  v_factor  NUMERIC;
BEGIN
  FOR v_partida IN
    SELECT *
    FROM presupuesto_operativo
    WHERE usuario_id = p_usuario_id
      AND activo = TRUE
  LOOP
    -- Elegir fuente de monto
    v_monto := CASE
      WHEN v_partida.fuente_activa = 'aprendido'
        AND v_partida.monto_aprendido IS NOT NULL
        THEN v_partida.monto_aprendido
      ELSE COALESCE(v_partida.monto_manual, 0)
    END;

    -- Margen de seguridad según confianza
    v_margen := CASE
      WHEN v_partida.confianza = 'baja' THEN 1.2
      ELSE 1.0
    END;

    -- Prorratear al período solicitado
    v_factor := CASE v_partida.frecuencia
      WHEN 'diario'    THEN p_dias::NUMERIC
      WHEN 'semanal'   THEN p_dias::NUMERIC / 7
      WHEN 'quincenal' THEN p_dias::NUMERIC / 15
      ELSE                  p_dias::NUMERIC / 30  -- mensual
    END;

    v_total := v_total + (v_monto * v_margen * v_factor);
  END LOOP;

  RETURN ROUND(v_total, 2);
END;
$$;

-- ── 8. PARTIDAS INICIALES SUGERIDAS ──────────────────────────
-- Insertar partidas de ejemplo para el onboarding.
-- Sustituir p_usuario_id con el UUID real del usuario.
-- El usuario ajusta los montos en la UI; estos son solo sugerencias.

-- COMENTADO — descomentar y personalizar al hacer onboarding:
/*
INSERT INTO presupuesto_operativo
  (usuario_id, categoria, frecuencia, monto_manual, fuente_activa, confianza)
VALUES
  ('p_usuario_id', 'comida',   'semanal',   1500, 'manual', 'baja'),
  ('p_usuario_id', 'gasolina', 'semanal',    700, 'manual', 'baja'),
  ('p_usuario_id', 'despensa', 'quincenal', 1200, 'manual', 'baja'),
  ('p_usuario_id', 'snacks',   'semanal',    300, 'manual', 'baja'),
  ('p_usuario_id', 'varios',   'semanal',    500, 'manual', 'baja');
*/
