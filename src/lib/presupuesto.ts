import { Database } from '@/types/database'

type PresupuestoOperativo = Database['public']['Tables']['presupuesto_operativo']['Row']
type Transaccion = Database['public']['Tables']['transacciones']['Row']

// ─── Reserva operativa ────────────────────────────────────────────────────────

/**
 * Calcula el monto a reservar para los próximos `dias` días
 * basado en las partidas activas del presupuesto_operativo del usuario.
 *
 * - Si confianza = 'baja': aplica margen de seguridad del 20%
 * - Si fuente_activa = 'aprendido' y hay monto_aprendido: usa ese monto
 * - Si no: usa monto_manual
 */
export function calcularReservaOperativa(
  partidas: PresupuestoOperativo[],
  dias: number
): number {
  return partidas
    .filter(p => p.activo)
    .reduce((total, p) => {
      const monto =
        p.fuente_activa === 'aprendido' && p.monto_aprendido
          ? Number(p.monto_aprendido)
          : Number(p.monto_manual ?? 0)
      const margen = p.confianza === 'baja' ? 1.2 : 1.0
      const factor =
        p.frecuencia === 'diario'    ? dias
        : p.frecuencia === 'semanal'   ? dias / 7
        : p.frecuencia === 'quincenal' ? dias / 15
        : dias / 30 // mensual
      return total + monto * margen * factor
    }, 0)
}

// ─── Gastos hormiga ───────────────────────────────────────────────────────────

export interface GastoHormiga {
  categoria: string
  subcategoria: string | null
  /** Suma del mes actual */
  total_mes: number
  /** Promedio mensual de los últimos 3 meses (sin incluir el actual) */
  promedio_3m: number
  /** Diferencia absoluta: total_mes - promedio_3m */
  diferencia: number
  /** Tendencia respecto al mes anterior */
  tendencia: 'subiendo' | 'bajando' | 'estable'
  /** Número de transacciones en el mes actual */
  n_transacciones: number
}

/**
 * Agrupa transacciones por categoria + subcategoria y calcula:
 * - Suma del mes actual vs. promedio de los 3 meses anteriores
 * - Tendencia respecto al mes anterior
 *
 * `transaccionesMes`     — transacciones del mes actual (tipo='gasto')
 * `transaccionesPrevias` — transacciones de los 3 meses anteriores (tipo='gasto')
 *
 * Solo devuelve partidas con al menos 1 transacción en el mes actual.
 * El análisis es descriptivo, nunca punitivo.
 */
export function detectarGastosHormiga(
  transaccionesMes: Transaccion[],
  transaccionesPrevias: Transaccion[]
): GastoHormiga[] {
  // Agrupa el mes actual por categoria + subcategoria
  const gastos = transaccionesMes.filter(t => t.tipo === 'gasto')

  type Grupo = { total: number; n: number }
  const mesActual = new Map<string, Grupo>()

  for (const t of gastos) {
    const key = `${t.categoria ?? 'sin_categoria'}||${t.subcategoria ?? ''}`
    const prev = mesActual.get(key) ?? { total: 0, n: 0 }
    mesActual.set(key, { total: prev.total + Number(t.monto), n: prev.n + 1 })
  }

  // Agrupa los 3 meses previos por mes + categoria + subcategoria
  // para calcular promedio mensual
  const previasPorMes = new Map<string, Map<string, number>>()

  for (const t of transaccionesPrevias.filter(t => t.tipo === 'gasto')) {
    const mes = t.fecha.slice(0, 7) // YYYY-MM
    const key = `${t.categoria ?? 'sin_categoria'}||${t.subcategoria ?? ''}`
    if (!previasPorMes.has(mes)) previasPorMes.set(mes, new Map())
    const mapa = previasPorMes.get(mes)!
    mapa.set(key, (mapa.get(key) ?? 0) + Number(t.monto))
  }

  const mesesPrevios = Array.from(previasPorMes.keys()).sort()

  const resultado: GastoHormiga[] = []

  for (const [key, { total, n }] of mesActual) {
    const [categoria, subcategoria] = key.split('||')

    // Promedio mensual de los últimos 3 meses
    const totalesPrevios = mesesPrevios.map(mes =>
      previasPorMes.get(mes)?.get(key) ?? 0
    )
    const promedio3m =
      totalesPrevios.length > 0
        ? totalesPrevios.reduce((a, b) => a + b, 0) / totalesPrevios.length
        : 0

    // Tendencia: comparar mes actual vs. el mes previo más reciente
    const totalMesPrevio = mesesPrevios.length > 0
      ? (previasPorMes.get(mesesPrevios[mesesPrevios.length - 1])?.get(key) ?? 0)
      : 0

    const diff = total - totalMesPrevio
    const tendencia: GastoHormiga['tendencia'] =
      Math.abs(diff) < total * 0.05 ? 'estable'
      : diff > 0 ? 'subiendo'
      : 'bajando'

    resultado.push({
      categoria,
      subcategoria: subcategoria || null,
      total_mes: total,
      promedio_3m: promedio3m,
      diferencia: total - promedio3m,
      tendencia,
      n_transacciones: n,
    })
  }

  // Ordena por diferencia descendente (los que más se dispararon primero)
  return resultado.sort((a, b) => b.diferencia - a.diferencia)
}
