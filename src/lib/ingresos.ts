import type { Database } from '@/types/database'
import {
  addDaysToISODate,
  formatISODateLocal,
  getEndOfMonthISO,
  getStartOfMonthISO,
  getTodayLocalISO,
  parseISODateLocal,
} from '@/lib/local-date'

type Ingreso = Database['public']['Tables']['ingresos']['Row']

type Frecuencia = 'mensual' | 'quincenal' | 'semanal' | 'anual'
export type IngresoPeriodKey = 'week' | 'month' | 'next30' | 'next45' | 'all'

type PeriodMeta = {
  key: IngresoPeriodKey
  label: string
  kpiScope: string
  sectionScope: string
  emptyScope: string
  projectionHorizonDays: number
  start: string | null
  end: string | null
}

export const DEFAULT_INGRESO_PERIOD: IngresoPeriodKey = 'month'

export const INGRESO_PERIOD_OPTIONS: Array<{
  key: IngresoPeriodKey
  label: string
}> = [
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Mes actual' },
  { key: 'next30', label: 'Proximos 30 dias' },
  { key: 'next45', label: 'Proximos 45 dias' },
  { key: 'all', label: 'Todo' },
]

function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function getStartOfWeekISO(todayIso: string): string {
  const day = parseISODateLocal(todayIso).getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDaysToISODate(todayIso, diff)
}

function getProjectionHorizonDays(end: string | null, today: string): number {
  if (!end) return 30

  const msInDay = 1000 * 60 * 60 * 24
  const diff = Math.floor(
    (parseISODateLocal(end).getTime() - parseISODateLocal(today).getTime()) / msInDay
  )
  return Math.max(diff, 0)
}

export function normalizeIngresoPeriod(value?: string | null): IngresoPeriodKey {
  return INGRESO_PERIOD_OPTIONS.some((option) => option.key === value)
    ? (value as IngresoPeriodKey)
    : DEFAULT_INGRESO_PERIOD
}

export function getIngresoPeriodMeta(
  period: IngresoPeriodKey,
  today = new Date()
): PeriodMeta {
  const todayIso = getTodayLocalISO(today)

  switch (period) {
    case 'week': {
      const start = getStartOfWeekISO(todayIso)
      const end = addDaysToISODate(start, 6)
      return {
        key: period,
        label: 'Esta semana',
        kpiScope: 'en la semana',
        sectionScope: 'de la semana',
        emptyScope: 'esta semana',
        projectionHorizonDays: getProjectionHorizonDays(end, todayIso),
        start,
        end,
      }
    }
    case 'next30': {
      const end = addDaysToISODate(todayIso, 29)
      return {
        key: period,
        label: 'Proximos 30 dias',
        kpiScope: 'en 30 dias',
        sectionScope: 'en 30 dias',
        emptyScope: 'los proximos 30 dias',
        projectionHorizonDays: 29,
        start: todayIso,
        end,
      }
    }
    case 'next45': {
      const end = addDaysToISODate(todayIso, 44)
      return {
        key: period,
        label: 'Proximos 45 dias',
        kpiScope: 'en 45 dias',
        sectionScope: 'en 45 dias',
        emptyScope: 'los proximos 45 dias',
        projectionHorizonDays: 44,
        start: todayIso,
        end,
      }
    }
    case 'all':
      return {
        key: period,
        label: 'Todo',
        kpiScope: 'total',
        sectionScope: 'totales',
        emptyScope: 'todo el historial',
        projectionHorizonDays: 30,
        start: null,
        end: null,
      }
    case 'month':
    default: {
      const start = getStartOfMonthISO(today)
      const end = getEndOfMonthISO(today)
      return {
        key: 'month',
        label: 'Mes actual',
        kpiScope: 'en el mes',
        sectionScope: 'del mes',
        emptyScope: 'este mes',
        projectionHorizonDays: getProjectionHorizonDays(end, todayIso),
        start,
        end,
      }
    }
  }
}

export function getIngresoEffectiveDate(ingreso: Ingreso): string | null {
  if (ingreso.estado === 'confirmado') {
    return ingreso.fecha_real ?? ingreso.fecha_esperada
  }

  return ingreso.fecha_esperada ?? ingreso.fecha_real
}

export function getIngresoRecurrenceBaseDate(
  ingreso: Pick<Ingreso, 'fecha_esperada' | 'fecha_real'>
): string | null {
  return ingreso.fecha_esperada ?? ingreso.fecha_real
}

export function resolveIngresoDiaDelMes(
  fecha: string | null | undefined,
  diaDelMes?: number | null
): number | null {
  if (diaDelMes && diaDelMes >= 1 && diaDelMes <= 31) {
    return diaDelMes
  }

  if (!fecha) return null

  const base = new Date(`${fecha}T12:00:00`)
  const day = base.getDate()
  const lastDay = getLastDayOfMonth(base.getFullYear(), base.getMonth())

  return day === lastDay ? 31 : day
}

export function filterIngresosByPeriod(
  ingresos: Ingreso[],
  period: IngresoPeriodKey,
  today = new Date()
): Ingreso[] {
  const { start, end } = getIngresoPeriodMeta(period, today)

  if (!start || !end) return ingresos

  return ingresos.filter((ingreso) => {
    const fecha = getIngresoEffectiveDate(ingreso)
    return fecha ? fecha >= start && fecha <= end : false
  })
}

export function calcularSiguienteFechaIngreso(
  baseFecha: string,
  frecuencia: Frecuencia,
  diaDelMes?: number | null
): string {
  const d = new Date(`${baseFecha}T12:00:00`)

  switch (frecuencia) {
    case 'mensual': {
      const nextMonthIndex = d.getMonth() + 1
      const nextYear = d.getFullYear() + Math.floor(nextMonthIndex / 12)
      const normalizedMonth = ((nextMonthIndex % 12) + 12) % 12
      const desiredDay = resolveIngresoDiaDelMes(baseFecha, diaDelMes) ?? d.getDate()
      const lastDay = getLastDayOfMonth(nextYear, normalizedMonth)
      const targetDay = desiredDay >= 31 ? lastDay : Math.min(desiredDay, lastDay)

      d.setFullYear(nextYear, normalizedMonth, targetDay)
      break
    }
    case 'quincenal':
      d.setDate(d.getDate() + 15)
      break
    case 'semanal':
      d.setDate(d.getDate() + 7)
      break
    case 'anual':
      d.setFullYear(d.getFullYear() + 1)
      break
  }

  return formatISODateLocal(d)
}

export function getProjectedRecurringIngresos(
  ingresos: Ingreso[],
  horizonDays = 30
): Ingreso[] {
  const todayIso = getTodayLocalISO()
  const hoy = parseISODateLocal(todayIso)

  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + horizonDays)
  const limiteIso = formatISODateLocal(limite)

  const ultimoPorNombre = new Map<string, Ingreso>()

  ingresos
    .filter((i) => i.estado === 'confirmado' && i.es_recurrente && i.frecuencia)
    .forEach((ingreso) => {
      const prev = ultimoPorNombre.get(ingreso.nombre)
      const fechaActual = ingreso.fecha_real ?? ingreso.fecha_esperada ?? ''
      const fechaPrev = prev ? (prev.fecha_real ?? prev.fecha_esperada ?? '') : ''

      if (!prev || fechaActual > fechaPrev) {
        ultimoPorNombre.set(ingreso.nombre, ingreso)
      }
    })

  const ingresosNoConfirmados = ingresos.filter((i) => i.estado !== 'confirmado')
  const projected: Ingreso[] = []

  for (const ingreso of ultimoPorNombre.values()) {
    const baseFecha = getIngresoRecurrenceBaseDate(ingreso)
    if (!baseFecha || !ingreso.frecuencia) continue

    const fechasExistentes = new Set(
      ingresosNoConfirmados
        .filter((candidate) => candidate.nombre === ingreso.nombre)
        .map((candidate) => candidate.fecha_esperada)
        .filter((fecha): fecha is string => Boolean(fecha))
    )

    let cursorFecha = baseFecha
    let sequence = 1

    while (true) {
      const siguienteFecha = calcularSiguienteFechaIngreso(
        cursorFecha,
        ingreso.frecuencia,
        ingreso.dia_del_mes
      )

      if (siguienteFecha > limiteIso) break

      cursorFecha = siguienteFecha

      if (siguienteFecha < todayIso) {
        continue
      }

      if (fechasExistentes.has(siguienteFecha)) {
        continue
      }

      fechasExistentes.add(siguienteFecha)
      projected.push({
        ...ingreso,
        id: `${ingreso.id}_next_${sequence}`,
        fecha_esperada: siguienteFecha,
        fecha_real: null,
        monto_real: null,
        estado: 'esperado',
      })
      sequence += 1
    }
  }

  return projected
}
