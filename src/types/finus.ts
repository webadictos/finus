// ─── Enums de dominio ──────────────────────────────────────────────────────────

export type TipoCuenta = 'banco' | 'efectivo' | 'digital' | 'inversion'

export type TipoTarjeta = 'credito' | 'departamental'

export type TitularTipo = 'personal' | 'pareja' | 'familiar' | 'empresa' | 'tercero'

export type TipoIngreso = 'fijo_recurrente' | 'proyecto_recurrente' | 'unico'

export type EstadoIngreso = 'confirmado' | 'pendiente' | 'en_riesgo'

export type TipoPago = 'fijo' | 'revolvente' | 'msi' | 'prestamo' | 'disposicion_efectivo'

export type TipoProgramacion = 'recurrente_aprox' | 'previsto_sin_fecha' | 'eventual'

export type NivelCerteza = 'alta' | 'media' | 'baja'

export type ColorRecomendacion =
  | 'verde'
  | 'amarillo'
  | 'naranja'
  | 'rojo'
  | 'morado'
  | 'rojo_fuerte'

// ─── Entidades de dominio ──────────────────────────────────────────────────────

export interface Cuenta {
  id: string
  usuario_id: string
  nombre: string
  tipo: TipoCuenta
  saldo_actual: number
  color: string | null
  icono: string | null
  moneda: string
  activa: boolean
  created_at: string
}

export interface Tarjeta {
  id: string
  usuario_id: string
  nombre: string
  tipo: TipoTarjeta
  titular_tipo: TitularTipo
  limite_credito: number
  saldo_actual: number
  /** Monto total del estado de cuenta */
  saldo_al_corte: number | null
  /** Pago para no generar intereses */
  pago_sin_intereses: number | null
  /** Pago mínimo requerido */
  pago_minimo: number | null
  fecha_corte: number | null   // día del mes
  fecha_limite_pago: number | null // día del mes
  tasa_interes_mensual: number | null
  activa: boolean
  created_at: string
}

export interface Ingreso {
  id: string
  usuario_id: string
  nombre: string
  tipo: TipoIngreso
  monto_esperado: number
  moneda: string
  fecha_esperada: string | null
  fecha_real: string | null
  recurrente_dia: number | null // día del mes para recurrentes
  estado: EstadoIngreso | 'esperado'
  probabilidad: NivelCerteza
  notas: string | null
  created_at: string
}

export interface Compromiso {
  id: string
  usuario_id: string
  tarjeta_id: string | null
  nombre: string
  tipo_pago: TipoPago
  /** Saldo actual de la deuda */
  saldo_real: number | null
  /** Mensualidad o cuota de pago */
  monto_mensualidad: number | null
  pago_minimo: number | null
  pago_sin_intereses: number | null
  /** Para MSI: número de mensualidades */
  msi_mensualidades: number | null
  msi_mensualidad: number | null
  tasa_interes_mensual: number | null
  fecha_proximo_pago: string | null
  dia_pago: number | null // día del mes
  prioridad: NivelCerteza | null
  activo: boolean
  created_at: string
}

export interface GastoPrevisto {
  id: string
  usuario_id: string
  nombre: string
  tipo_programacion: TipoProgramacion
  monto_estimado: number
  certeza: NivelCerteza
  fecha_estimada: string | null
  mes_estimado: string | null // YYYY-MM
  notas: string | null
  created_at: string
}

export interface Meta {
  id: string
  usuario_id: string
  nombre: string
  monto_objetivo: number
  monto_actual: number
  fecha_objetivo: string | null
  activa: boolean
  created_at: string
}

// ─── Recomendación ────────────────────────────────────────────────────────────

export interface Recomendacion {
  accion: string
  detalle: string | null
  color: ColorRecomendacion
  /** Monto sugerido a pagar */
  monto_sugerido: number | null
  /** Monto mínimo absoluto */
  monto_minimo: number | null
  /** Interés estimado mensual si solo paga el mínimo */
  interes_estimado_mensual: number | null
  /** Fecha del ingreso próximo si aplica */
  fecha_ingreso_proximo: string | null
  /** Nombre del ingreso próximo si aplica */
  nombre_ingreso_proximo: string | null
}

// ─── Inputs para recomendación ────────────────────────────────────────────────

export interface CompromisoParaRecomendacion {
  tipo_pago: TipoPago
  saldo_real: number | null
  monto_mensualidad: number | null
  pago_minimo: number | null
  pago_sin_intereses: number | null
  msi_mensualidades: number | null
  msi_mensualidad: number | null
  tasa_interes_mensual: number | null
  fecha_proximo_pago: string | null
  nombre: string
}

export interface IngresoProximo {
  nombre: string
  monto: number
  fecha_esperada: string
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface ResumenFlujoCaja {
  saldo_total_disponible: number
  total_ingresos_confirmados: number
  total_ingresos_probables: number
  total_compromisos_pendientes: number
  total_gastos_previstos: number
  colchon_recomendado: number
  flujo_neto: number
}

export interface AlertaVencimiento {
  id: string
  nombre: string
  tipo: 'compromiso' | 'gasto'
  monto: number
  fecha_proximo_pago: string
  dias_restantes: number
  recomendacion?: Recomendacion
}
