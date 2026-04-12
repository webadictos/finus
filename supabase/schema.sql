-- ============================================================
-- Finus — Schema completo
-- Última actualización: Abril 2026
--
-- Fuentes:
--   • src/types/database.ts        — tablas originales
--   • migration_proyectos.sql      — proyectos y proyecto_proveedores
--   • CLAUDE.md (CREATE TABLE)     — lineas_credito, cargos_linea, pagos_linea
--
-- Nota: para las tablas originales (usuarios → metas) los nombres
-- de enum se infieren de los tipos TypeScript. Los CREATE TABLE de
-- proyectos, lineas_credito, cargos_linea y pagos_linea son exactos.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════════════════════

-- ── Cuentas ──────────────────────────────────────────────────
CREATE TYPE tipo_cuenta AS ENUM (
  'banco',
  'efectivo',
  'digital',
  'inversion'
);

-- ── Tarjetas ─────────────────────────────────────────────────
CREATE TYPE tipo_tarjeta AS ENUM (
  'credito',
  'departamental'
);

-- ── Titular (compartido: tarjetas y lineas_credito) ──────────
CREATE TYPE tipo_titular AS ENUM (
  'personal',
  'pareja',
  'familiar',
  'empresa',
  'tercero'
);

-- ── Ingresos ─────────────────────────────────────────────────
CREATE TYPE tipo_ingreso AS ENUM (
  'fijo_recurrente',
  'proyecto_recurrente',
  'unico'
);

CREATE TYPE tipo_frecuencia AS ENUM (
  'mensual',
  'quincenal',
  'semanal',
  'anual'
);

CREATE TYPE estado_ingreso AS ENUM (
  'confirmado',
  'pendiente',
  'en_riesgo',
  'esperado'
);

-- ── Nivel compartido (probabilidad / certeza / prioridad) ────
CREATE TYPE nivel AS ENUM (
  'alta',
  'media',
  'baja'
);

-- ── Compromisos ───────────────────────────────────────────────
-- ⚠️ 'suscripcion' se añadió vía: ALTER TYPE tipo_pago ADD VALUE 'suscripcion';
CREATE TYPE tipo_pago AS ENUM (
  'fijo',
  'revolvente',
  'msi',
  'prestamo',
  'suscripcion',
  'disposicion_efectivo'
);

-- ── Gastos previstos ─────────────────────────────────────────
CREATE TYPE tipo_programacion AS ENUM (
  'recurrente_aprox',
  'previsto_sin_fecha',
  'eventual'
);

-- ── Transacciones ─────────────────────────────────────────────
CREATE TYPE tipo_transaccion AS ENUM (
  'ingreso',
  'gasto',
  'transferencia'
);

-- ── Proyectos ─────────────────────────────────────────────────
CREATE TYPE estado_proyecto AS ENUM (
  'planeando',
  'en_curso',
  'completado',
  'cancelado'
);

CREATE TYPE estado_proveedor AS ENUM (
  'sin_anticipo',
  'anticipo_pagado',
  'abonando',
  'liquidado',
  'cancelado'
);

-- ── Acuerdos de pago ─────────────────────────────────────────
CREATE TYPE estado_acuerdo AS ENUM (
  'activo',
  'cumplido',
  'incumplido'
);

-- ── Líneas de crédito ─────────────────────────────────────────
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


-- ══════════════════════════════════════════════════════════════
-- TABLA BASE
-- ══════════════════════════════════════════════════════════════

CREATE TABLE usuarios (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  nombre      TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ══════════════════════════════════════════════════════════════
-- TABLAS DEPENDIENTES
-- ══════════════════════════════════════════════════════════════

-- ── cuentas ───────────────────────────────────────────────────
CREATE TABLE cuentas (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                TEXT        NOT NULL,
  tipo                  tipo_cuenta NOT NULL,
  saldo_actual          NUMERIC     NOT NULL DEFAULT 0,
  -- ⚠️ Solo modificar saldo_actual vía RPC incrementar_saldo / decrementar_saldo
  tiene_tarjeta_debito  BOOLEAN     NOT NULL DEFAULT FALSE,
  ultimos_4_debito      TEXT,
  color                 TEXT,
  icono                 TEXT,
  moneda                TEXT        NOT NULL DEFAULT 'MXN',
  activa                BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── tarjetas (DEPRECADA — usar lineas_credito para nuevos registros) ──
CREATE TABLE tarjetas (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID           NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre              TEXT           NOT NULL,
  banco               TEXT           NOT NULL,
  tipo                tipo_tarjeta   NOT NULL,
  titular_tipo        tipo_titular   NOT NULL DEFAULT 'personal',
  titular_nombre      TEXT,
  ultimos_4           TEXT,
  limite_credito      NUMERIC        NOT NULL DEFAULT 0,
  saldo_actual        NUMERIC        NOT NULL DEFAULT 0,
  saldo_al_corte      NUMERIC,
  pago_sin_intereses  NUMERIC,
  pago_minimo         NUMERIC,
  dia_corte           INT,
  dia_limite_pago     INT,
  tasa_interes_mensual NUMERIC,
  activa              BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── lineas_credito ────────────────────────────────────────────
-- Reemplaza a tarjetas. Representa tarjetas de crédito, líneas
-- digitales (Mercado Pago, Kueski), BNPL y departamentales.
-- tasa_interes_anual (no mensual) — dividir /12 para cálculos mensuales.
CREATE TABLE lineas_credito (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID               NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                TEXT               NOT NULL,
  banco                 TEXT,
  tipo                  tipo_linea_credito NOT NULL,
  titular_tipo          tipo_titular       NOT NULL DEFAULT 'personal',
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

-- ── metas ─────────────────────────────────────────────────────
CREATE TABLE metas (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre          TEXT        NOT NULL,
  monto_objetivo  NUMERIC     NOT NULL,
  monto_actual    NUMERIC     NOT NULL DEFAULT 0,
  fecha_objetivo  DATE,
  activa          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ingresos ──────────────────────────────────────────────────
CREATE TABLE ingresos (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre            TEXT            NOT NULL,
  tipo              tipo_ingreso    NOT NULL,
  es_recurrente     BOOLEAN         NOT NULL DEFAULT FALSE,
  frecuencia        tipo_frecuencia,
  dia_del_mes       INT,
  fecha_inicio      DATE,
  fecha_fin         DATE,
  indefinido        BOOLEAN         NOT NULL DEFAULT FALSE,
  monto_fijo        NUMERIC,
  -- ⚠️ monto_esperado, NO monto
  monto_esperado    NUMERIC,
  monto_minimo      NUMERIC,
  monto_maximo      NUMERIC,
  -- ⚠️ fecha_esperada, NO fecha_cobro
  fecha_esperada    DATE,
  fecha_real        DATE,
  monto_real        NUMERIC,
  estado            estado_ingreso  NOT NULL DEFAULT 'esperado',
  probabilidad      nivel           NOT NULL DEFAULT 'alta',
  cuenta_destino_id UUID            REFERENCES cuentas(id),
  -- saldo de cuenta_destino se incrementa al confirmar con confirmarIngreso
  forma_recepcion   TEXT,
  concepto_fiscal   TEXT,
  requiere_factura  BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── compromisos ───────────────────────────────────────────────
-- Para deudas de cuota fija: préstamos, servicios, seguros, suscripciones.
-- tarjetas de crédito/líneas → usar lineas_credito + cargos_linea.
-- ⚠️ frecuencia añadida posteriormente vía ALTER TABLE
CREATE TABLE compromisos (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id              UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tarjeta_id              UUID        REFERENCES tarjetas(id),
  nombre                  TEXT        NOT NULL,
  categoria               TEXT,
  -- ⚠️ tipo_pago: 'suscripcion' añadido vía ALTER TYPE tipo_pago ADD VALUE 'suscripcion';
  tipo_pago               tipo_pago   NOT NULL,
  frecuencia              tipo_frecuencia,
  -- ⚠️ monto_mensualidad, NO msi_mensualidad
  monto_mensualidad       NUMERIC,
  -- ⚠️ fecha_proximo_pago, NO fecha_vencimiento
  fecha_proximo_pago      DATE,
  -- ⚠️ mensualidades_restantes, NO msi_mensualidades
  mensualidades_restantes INT,
  fecha_inicio            DATE,
  monto_original          NUMERIC,
  meses_totales           INT,
  saldo_estimado          NUMERIC,
  fecha_fin_estimada      DATE,
  saldo_real              NUMERIC,
  pago_sin_intereses      NUMERIC,
  pago_minimo             NUMERIC,
  fecha_corte             DATE,
  -- ⚠️ tasa_interes_anual, NO tasa_interes_mensual — dividir /12 para cálculos mensuales
  tasa_interes_anual      NUMERIC,
  prioridad               nivel,
  -- ⚠️ activo (masculino), NO activa
  activo                  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── acuerdos_pago ─────────────────────────────────────────────
CREATE TABLE acuerdos_pago (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID           NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  compromiso_id   UUID           NOT NULL REFERENCES compromisos(id) ON DELETE CASCADE,
  monto_acordado  NUMERIC        NOT NULL,
  fecha_acuerdo   DATE           NOT NULL DEFAULT CURRENT_DATE,
  fecha_limite    DATE           NOT NULL,
  monto_abonado   NUMERIC        NOT NULL DEFAULT 0,
  monto_pendiente NUMERIC        NOT NULL DEFAULT 0,
  estado          estado_acuerdo NOT NULL DEFAULT 'activo',
  notas           TEXT,
  activo          BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── transacciones ─────────────────────────────────────────────
-- proyecto_proveedor_id se añade después con ALTER TABLE (dependencia circular)
-- ❌ NO existe columna ingreso_id
CREATE TABLE transacciones (
  id                    UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id            UUID             NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo                  tipo_transaccion NOT NULL,
  monto                 NUMERIC          NOT NULL,
  fecha                 DATE             NOT NULL,
  descripcion           TEXT,
  categoria             TEXT,
  cuenta_id             UUID             REFERENCES cuentas(id),
  tarjeta_id            UUID             REFERENCES tarjetas(id),
  compromiso_id         UUID             REFERENCES compromisos(id),
  forma_pago            TEXT,
  meses_msi             INT,
  es_recurrente         BOOLEAN          NOT NULL DEFAULT FALSE,
  notas                 TEXT,
  created_at            TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ── gastos_previstos ──────────────────────────────────────────
CREATE TABLE gastos_previstos (
  id                UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID              NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre            TEXT              NOT NULL,
  monto_estimado    NUMERIC           NOT NULL,
  tipo_programacion tipo_programacion NOT NULL,
  frecuencia_dias   INT,
  ultima_ocurrencia DATE,
  mes               TEXT,             -- formato YYYY-MM para tipo 'previsto_sin_fecha'
  ventana_dias      INT,
  certeza           nivel             NOT NULL DEFAULT 'media',
  fecha_sugerida    DATE,             -- calculada automáticamente
  fecha_confirmada  DATE,             -- confirmada por el usuario
  realizado         BOOLEAN           NOT NULL DEFAULT FALSE,
  monto_real        NUMERIC,
  notas             TEXT,
  -- ⚠️ activo (masculino), NO activa
  activo            BOOLEAN           NOT NULL DEFAULT TRUE,
  transaccion_id    UUID              REFERENCES transacciones(id),
  created_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- ── proyectos ─────────────────────────────────────────────────
CREATE TABLE proyectos (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id          UUID            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre              TEXT            NOT NULL,
  descripcion         TEXT,
  fecha_evento        DATE,
  -- Campos calculados — NO actualizar directamente, usar RPC recalcular_proyecto
  total_comprometido  NUMERIC         NOT NULL DEFAULT 0,
  total_abonado       NUMERIC         NOT NULL DEFAULT 0,
  total_pendiente     NUMERIC         NOT NULL DEFAULT 0,
  techo_gasto         NUMERIC,
  estado              estado_proyecto NOT NULL DEFAULT 'planeando',
  activo              BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ── proyecto_proveedores ──────────────────────────────────────
CREATE TABLE proyecto_proveedores (
  id                        UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id               UUID             NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  usuario_id                UUID             NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                    TEXT             NOT NULL,
  categoria                 TEXT,
  monto_total               NUMERIC          NOT NULL,
  anticipo_requerido        NUMERIC,
  fecha_anticipo            DATE,
  fecha_limite_liquidacion  DATE             NOT NULL,
  -- Campos calculados — NO actualizar directamente, usar RPC recalcular_proyecto
  monto_abonado             NUMERIC          NOT NULL DEFAULT 0,
  monto_pendiente           NUMERIC          NOT NULL DEFAULT 0,
  estado                    estado_proveedor NOT NULL DEFAULT 'sin_anticipo',
  notas                     TEXT,
  activo                    BOOLEAN          NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- ── transacciones.proyecto_proveedor_id (dependencia diferida) ──
ALTER TABLE transacciones
  ADD COLUMN IF NOT EXISTS proyecto_proveedor_id UUID REFERENCES proyecto_proveedores(id);

-- ── cargos_linea ──────────────────────────────────────────────
-- Desglose interno de cada línea de crédito (informativo).
-- El pago es siempre global contra la línea, no por cargo individual.
-- Para revolvente: solo un cargo activo por línea (saldo_pendiente se
-- actualiza cada corte). Para MSI: activo=false cuando mensualidades_restantes=0.
CREATE TABLE cargos_linea (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_credito_id        UUID        NOT NULL REFERENCES lineas_credito(id) ON DELETE CASCADE,
  usuario_id              UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre                  TEXT        NOT NULL,
  tipo                    tipo_cargo  NOT NULL,
  monto_original          NUMERIC     NOT NULL,
  monto_mensualidad       NUMERIC,
  mensualidades_totales   INT,
  mensualidades_restantes INT,
  saldo_pendiente         NUMERIC     NOT NULL,
  tasa_efectiva_anual     NUMERIC     DEFAULT 0,
  notas                   TEXT,
  -- ⚠️ activo (masculino), NO activa
  activo                  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── pagos_linea ───────────────────────────────────────────────
-- Historial de pagos reales hechos contra una línea de crédito.
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


-- ══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════

-- cuentas
CREATE INDEX idx_cuentas_usuario        ON cuentas(usuario_id);
CREATE INDEX idx_cuentas_activa         ON cuentas(usuario_id, activa);

-- tarjetas
CREATE INDEX idx_tarjetas_usuario       ON tarjetas(usuario_id);
CREATE INDEX idx_tarjetas_activa        ON tarjetas(usuario_id, activa);

-- ingresos
CREATE INDEX idx_ingresos_usuario       ON ingresos(usuario_id);
CREATE INDEX idx_ingresos_estado        ON ingresos(usuario_id, estado);
CREATE INDEX idx_ingresos_fecha         ON ingresos(usuario_id, fecha_esperada);

-- compromisos
CREATE INDEX idx_compromisos_usuario    ON compromisos(usuario_id);
CREATE INDEX idx_compromisos_activo     ON compromisos(usuario_id, activo);
CREATE INDEX idx_compromisos_vencimiento ON compromisos(usuario_id, fecha_proximo_pago);
CREATE INDEX idx_compromisos_tarjeta    ON compromisos(tarjeta_id);

-- acuerdos_pago
CREATE INDEX idx_acuerdos_usuario       ON acuerdos_pago(usuario_id);
CREATE INDEX idx_acuerdos_compromiso    ON acuerdos_pago(compromiso_id);

-- gastos_previstos
CREATE INDEX idx_gastos_prev_usuario    ON gastos_previstos(usuario_id);
CREATE INDEX idx_gastos_prev_activo     ON gastos_previstos(usuario_id, activo);

-- transacciones
CREATE INDEX idx_transacciones_usuario  ON transacciones(usuario_id);
CREATE INDEX idx_transacciones_fecha    ON transacciones(usuario_id, fecha);
CREATE INDEX idx_transacciones_cuenta   ON transacciones(cuenta_id);
CREATE INDEX idx_transacciones_tarjeta  ON transacciones(tarjeta_id);
CREATE INDEX idx_transacciones_proveedor ON transacciones(proyecto_proveedor_id);

-- proyectos
CREATE INDEX idx_proyectos_usuario      ON proyectos(usuario_id);
CREATE INDEX idx_proyectos_activo       ON proyectos(usuario_id, activo);

-- proyecto_proveedores
CREATE INDEX idx_proveedores_proyecto   ON proyecto_proveedores(proyecto_id);
CREATE INDEX idx_proveedores_usuario    ON proyecto_proveedores(usuario_id);

-- metas
CREATE INDEX idx_metas_usuario          ON metas(usuario_id);

-- lineas_credito
CREATE INDEX idx_lineas_usuario         ON lineas_credito(usuario_id);
CREATE INDEX idx_lineas_activa          ON lineas_credito(usuario_id, activa);

-- cargos_linea
CREATE INDEX idx_cargos_linea           ON cargos_linea(linea_credito_id);
CREATE INDEX idx_cargos_usuario         ON cargos_linea(usuario_id);
CREATE INDEX idx_cargos_activo          ON cargos_linea(linea_credito_id, activo);

-- pagos_linea
CREATE INDEX idx_pagos_linea            ON pagos_linea(linea_credito_id);
CREATE INDEX idx_pagos_usuario          ON pagos_linea(usuario_id);
CREATE INDEX idx_pagos_fecha            ON pagos_linea(linea_credito_id, fecha);


-- ══════════════════════════════════════════════════════════════
-- RLS (Row Level Security)
-- ══════════════════════════════════════════════════════════════
-- Política uniforme: cada usuario solo ve y modifica sus propios registros.

ALTER TABLE usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarjetas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE compromisos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE acuerdos_pago        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_previstos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE metas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_credito       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos_linea         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_linea          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios: usuario ve el suyo"
  ON usuarios FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "cuentas: usuario ve las suyas"
  ON cuentas FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "tarjetas: usuario ve las suyas"
  ON tarjetas FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "ingresos: usuario ve los suyos"
  ON ingresos FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "compromisos: usuario ve los suyos"
  ON compromisos FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "acuerdos_pago: usuario ve los suyos"
  ON acuerdos_pago FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "gastos_previstos: usuario ve los suyos"
  ON gastos_previstos FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "transacciones: usuario ve las suyas"
  ON transacciones FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "proyectos: usuario ve los suyos"
  ON proyectos FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "proveedores: usuario ve los suyos"
  ON proyecto_proveedores FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "metas: usuario ve las suyas"
  ON metas FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "lineas_credito: usuario ve las suyas"
  ON lineas_credito FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "cargos_linea: usuario ve los suyos"
  ON cargos_linea FOR ALL
  USING (auth.uid() = usuario_id);

CREATE POLICY "pagos_linea: usuario ve los suyos"
  ON pagos_linea FOR ALL
  USING (auth.uid() = usuario_id);


-- ══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cuentas_updated_at
  BEFORE UPDATE ON cuentas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tarjetas_updated_at
  BEFORE UPDATE ON tarjetas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ingresos_updated_at
  BEFORE UPDATE ON ingresos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_compromisos_updated_at
  BEFORE UPDATE ON compromisos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_acuerdos_updated_at
  BEFORE UPDATE ON acuerdos_pago
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_gastos_prev_updated_at
  BEFORE UPDATE ON gastos_previstos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_proyectos_updated_at
  BEFORE UPDATE ON proyectos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
  BEFORE UPDATE ON proyecto_proveedores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_metas_updated_at
  BEFORE UPDATE ON metas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_lineas_updated_at
  BEFORE UPDATE ON lineas_credito
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cargos_updated_at
  BEFORE UPDATE ON cargos_linea
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ══════════════════════════════════════════════════════════════
-- RPCs
-- ══════════════════════════════════════════════════════════════

-- ── incrementar_saldo ─────────────────────────────────────────
-- Llamar al confirmar un ingreso con cuenta_destino_id.
CREATE OR REPLACE FUNCTION incrementar_saldo(p_cuenta_id UUID, p_monto NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cuentas
  SET saldo_actual = saldo_actual + p_monto,
      updated_at   = NOW()
  WHERE id = p_cuenta_id;
END;
$$;

-- ── decrementar_saldo ─────────────────────────────────────────
-- Llamar al registrar un gasto (efectivo/débito) o al marcar
-- un compromiso como pagado seleccionando cuenta.
CREATE OR REPLACE FUNCTION decrementar_saldo(p_cuenta_id UUID, p_monto NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cuentas
  SET saldo_actual = saldo_actual - p_monto,
      updated_at   = NOW()
  WHERE id = p_cuenta_id;
END;
$$;

-- ── recalcular_proyecto ───────────────────────────────────────
-- Recalcula totales del proyecto y estado de cada proveedor.
-- Llamar después de cualquier insert/update/delete sobre transacciones
-- que referencien proyecto_proveedor_id.
CREATE OR REPLACE FUNCTION recalcular_proyecto(p_proyecto_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proveedor RECORD;
  v_abonado   NUMERIC;
BEGIN
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
        WHEN v_abonado = 0                        THEN 'sin_anticipo'
        WHEN v_abonado >= v_proveedor.monto_total THEN 'liquidado'
        ELSE                                           'abonando'
      END,
      updated_at = NOW()
    WHERE id = v_proveedor.id;
  END LOOP;

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

-- ── decrementar_saldo_linea ──────────────────────────────────
-- Equivalente a decrementar_saldo pero para lineas_credito.
-- Usa GREATEST(0, ...) para evitar saldos negativos por error.
-- Llamar desde registrarPagoLinea en lugar de update directo.
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

-- ── calcular_pago_sugerido_linea ──────────────────────────────
-- Devuelve el monto mínimo sugerido a pagar en una línea:
--   mensualidades MSI activas (obligatorias) +
--   saldo revolvente activo (según disponibilidad, la lógica
--   de recommendations.ts decide cuánto recomendar).
CREATE OR REPLACE FUNCTION calcular_pago_sugerido_linea(p_linea_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_msi_total      NUMERIC;
  v_revolvente     NUMERIC;
BEGIN
  SELECT COALESCE(SUM(monto_mensualidad), 0) INTO v_msi_total
  FROM cargos_linea
  WHERE linea_credito_id = p_linea_id
    AND tipo  = 'msi'
    AND activo = TRUE;

  SELECT COALESCE(SUM(saldo_pendiente), 0) INTO v_revolvente
  FROM cargos_linea
  WHERE linea_credito_id = p_linea_id
    AND tipo  = 'revolvente'
    AND activo = TRUE;

  RETURN v_msi_total + v_revolvente;
END;
$$;
