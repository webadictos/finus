import {
  addDaysToISODate,
  getEndOfMonthISO,
  getTodayLocalISO,
  parseISODateLocal,
} from '@/lib/local-date'

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

function getProjectionHorizonDays(start: string, end: string): number {
  const msInDay = 1000 * 60 * 60 * 24
  return Math.max(
    Math.floor(
      (parseISODateLocal(end).getTime() - parseISODateLocal(start).getTime()) / msInDay
    ),
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
  const todayIso = getTodayLocalISO(today)

  switch (period) {
    case 'next7': {
      const end = addDaysToISODate(todayIso, 6)
      return {
        key: period,
        label: '7 dias',
        sublabel: 'Proximos 7 dias',
        projectionLabel: 'Proyeccion 7 dias',
        emptyLabel: 'los proximos 7 dias',
        start: todayIso,
        end,
        projectionHorizonDays: 6,
      }
    }
    case 'next15': {
      const end = addDaysToISODate(todayIso, 14)
      return {
        key: period,
        label: '15 dias',
        sublabel: 'Proximos 15 dias',
        projectionLabel: 'Proyeccion 15 dias',
        emptyLabel: 'los proximos 15 dias',
        start: todayIso,
        end,
        projectionHorizonDays: 14,
      }
    }
    case 'next30': {
      const end = addDaysToISODate(todayIso, 29)
      return {
        key: period,
        label: '30 dias',
        sublabel: 'Proximos 30 dias',
        projectionLabel: 'Proyeccion 30 dias',
        emptyLabel: 'los proximos 30 dias',
        start: todayIso,
        end,
        projectionHorizonDays: 29,
      }
    }
    case 'month':
    default: {
      const end = getEndOfMonthISO(today)
      return {
        key: 'month',
        label: 'Mes actual',
        sublabel: 'Mes actual',
        projectionLabel: 'Proyeccion mes actual',
        emptyLabel: 'el resto del mes actual',
        start: todayIso,
        end,
        projectionHorizonDays: getProjectionHorizonDays(todayIso, end),
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
