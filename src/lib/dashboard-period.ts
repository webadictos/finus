export type DashboardPeriodKey = 'next7' | 'next15' | 'month' | 'next30'

type DashboardPeriodMeta = {
  key: DashboardPeriodKey
  label: string
  sublabel: string
  projectionLabel: string
  emptyLabel: string
  start: string
  end: string
  projectionHorizonDays: number
}

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriodKey = 'month'

export const DASHBOARD_PERIOD_OPTIONS: Array<{
  key: DashboardPeriodKey
  label: string
}> = [
  { key: 'next7', label: '7 dias' },
  { key: 'next15', label: '15 dias' },
  { key: 'month', label: 'Mes actual' },
  { key: 'next30', label: '30 dias' },
]

function normalizeDate(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function getProjectionHorizonDays(start: Date, end: Date): number {
  const msInDay = 1000 * 60 * 60 * 24
  return Math.max(
    Math.floor((normalizeDate(end).getTime() - normalizeDate(start).getTime()) / msInDay),
    0
  )
}

export function normalizeDashboardPeriod(value?: string | null): DashboardPeriodKey {
  return DASHBOARD_PERIOD_OPTIONS.some((option) => option.key === value)
    ? (value as DashboardPeriodKey)
    : DEFAULT_DASHBOARD_PERIOD
}

export function getDashboardPeriodMeta(
  period: DashboardPeriodKey,
  today = new Date()
): DashboardPeriodMeta {
  const currentDate = normalizeDate(today)

  switch (period) {
    case 'next7': {
      const end = addDays(currentDate, 6)
      return {
        key: period,
        label: '7 dias',
        sublabel: 'Proximos 7 dias',
        projectionLabel: 'Proyeccion 7 dias',
        emptyLabel: 'los proximos 7 dias',
        start: toDateKey(currentDate),
        end: toDateKey(end),
        projectionHorizonDays: 6,
      }
    }
    case 'next15': {
      const end = addDays(currentDate, 14)
      return {
        key: period,
        label: '15 dias',
        sublabel: 'Proximos 15 dias',
        projectionLabel: 'Proyeccion 15 dias',
        emptyLabel: 'los proximos 15 dias',
        start: toDateKey(currentDate),
        end: toDateKey(end),
        projectionHorizonDays: 14,
      }
    }
    case 'next30': {
      const end = addDays(currentDate, 29)
      return {
        key: period,
        label: '30 dias',
        sublabel: 'Proximos 30 dias',
        projectionLabel: 'Proyeccion 30 dias',
        emptyLabel: 'los proximos 30 dias',
        start: toDateKey(currentDate),
        end: toDateKey(end),
        projectionHorizonDays: 29,
      }
    }
    case 'month':
    default: {
      const end = getEndOfMonth(currentDate)
      return {
        key: 'month',
        label: 'Mes actual',
        sublabel: 'Mes actual',
        projectionLabel: 'Proyeccion mes actual',
        emptyLabel: 'el resto del mes actual',
        start: toDateKey(currentDate),
        end: toDateKey(end),
        projectionHorizonDays: getProjectionHorizonDays(currentDate, end),
      }
    }
  }
}

export function isDateWithinDashboardPeriod(
  dateValue: string | null | undefined,
  period: DashboardPeriodKey,
  today = new Date()
): boolean {
  if (!dateValue) return false

  const { start, end } = getDashboardPeriodMeta(period, today)
  return dateValue >= start && dateValue <= end
}
