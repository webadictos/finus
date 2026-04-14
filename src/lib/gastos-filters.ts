import {
  addDaysLocal,
  formatISODateForLocale,
  formatISODateLocal,
  getCurrentMonthKey,
  getEndOfMonthISO,
  getStartOfMonthISO,
  getTodayLocalISO,
  parseISODateLocal,
  type ISODateString,
} from '@/lib/local-date'

export type GastoPeriodKey = 'today' | 'week' | 'month' | 'all' | 'custom'
export type GastoPaymentKey =
  | 'all'
  | 'debito'
  | 'credito_revolvente'
  | 'msi'
  | 'efectivo'
  | 'prestamo'
  | 'otro'

type GastoPeriodMeta = {
  key: GastoPeriodKey
  label: string
  start: string | null
  end: string | null
  emptyLabel: string
  monthKey: `${number}-${number}`
}

export const DEFAULT_GASTO_PERIOD: GastoPeriodKey = 'month'
export const DEFAULT_GASTO_PAYMENT: GastoPaymentKey = 'all'

export const GASTO_PERIOD_OPTIONS: Array<{ key: GastoPeriodKey; label: string }> = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: '7 dias' },
  { key: 'month', label: 'Mes actual' },
  { key: 'all', label: 'Todo' },
  { key: 'custom', label: 'Rango' },
]

export const GASTO_PAYMENT_OPTIONS: Array<{ key: GastoPaymentKey; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'debito', label: 'Debito' },
  { key: 'credito_revolvente', label: 'Credito' },
  { key: 'msi', label: 'MSI' },
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'prestamo', label: 'Prestamo' },
  { key: 'otro', label: 'Otro' },
]

export function normalizeGastoPeriod(value?: string | null): GastoPeriodKey {
  return GASTO_PERIOD_OPTIONS.some((option) => option.key === value)
    ? (value as GastoPeriodKey)
    : DEFAULT_GASTO_PERIOD
}

export function normalizeGastoPayment(value?: string | null): GastoPaymentKey {
  return GASTO_PAYMENT_OPTIONS.some((option) => option.key === value)
    ? (value as GastoPaymentKey)
    : DEFAULT_GASTO_PAYMENT
}

function isValidISODate(value?: string | null): value is ISODateString {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value))
}

function formatRangeLabel(from: string, to: string): string {
  const fromLabel = formatISODateForLocale(from, { day: 'numeric', month: 'short' })
  const toLabel = formatISODateForLocale(to, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fromLabel} - ${toLabel}`
}

export function getGastoPeriodMeta(
  period: GastoPeriodKey,
  from?: string | null,
  to?: string | null,
  today = new Date()
): GastoPeriodMeta {
  const todayIso = getTodayLocalISO(today)
  const currentMonth = getCurrentMonthKey(today)

  switch (period) {
    case 'today':
      return {
        key: period,
        label: 'Hoy',
        start: todayIso,
        end: todayIso,
        emptyLabel: 'hoy',
        monthKey: currentMonth,
      }
    case 'week': {
      const start = formatISODateLocal(addDaysLocal(today, -6))
      return {
        key: period,
        label: 'Ultimos 7 dias',
        start,
        end: todayIso,
        emptyLabel: 'los ultimos 7 dias',
        monthKey: currentMonth,
      }
    }
    case 'all':
      return {
        key: period,
        label: 'Todo',
        start: null,
        end: null,
        emptyLabel: 'todo el historial',
        monthKey: currentMonth,
      }
    case 'custom':
      if (isValidISODate(from) && isValidISODate(to) && from <= to) {
        return {
          key: period,
          label: formatRangeLabel(from, to),
          start: from,
          end: to,
          emptyLabel: `el rango ${formatRangeLabel(from, to)}`,
          monthKey: from.slice(0, 7) as `${number}-${number}`,
        }
      }
      return getGastoPeriodMeta('month', null, null, today)
    case 'month':
    default:
      if (isValidISODate(from) && isValidISODate(to) && from <= to) {
        const monthKey = from.slice(0, 7) as `${number}-${number}`
        return {
          key: 'month',
          label: formatMonthKeyLabel(monthKey),
          start: from,
          end: to,
          emptyLabel: `el mes de ${formatMonthKeyLabel(monthKey)}`,
          monthKey,
        }
      }
      return {
        key: 'month',
        label: formatISODateForLocale(getStartOfMonthISO(today), { month: 'long', year: 'numeric' }),
        start: getStartOfMonthISO(today),
        end: getEndOfMonthISO(today),
        emptyLabel: 'este mes',
        monthKey: currentMonth,
      }
  }
}

export function isOtherPayment(value: string | null | undefined): boolean {
  return !value || !GASTO_PAYMENT_OPTIONS.some((option) => option.key === value)
}

export function getPaymentLabel(payment: GastoPaymentKey): string {
  return GASTO_PAYMENT_OPTIONS.find((option) => option.key === payment)?.label ?? 'Todos'
}

export function formatMonthKeyLabel(monthKey: `${number}-${number}`): string {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  })
}

export function shiftMonthKey(monthKey: `${number}-${number}`, delta: number): `${number}-${number}` {
  const [year, month] = monthKey.split('-').map(Number)
  const next = new Date(year, month - 1 + delta, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}` as `${number}-${number}`
}

export function getMonthRange(monthKey: `${number}-${number}`): { start: ISODateString; end: ISODateString } {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return {
    start: getStartOfMonthISO(date),
    end: getEndOfMonthISO(date),
  }
}

export function normalizeCustomDateInput(value?: string | null): string {
  return isValidISODate(value) ? value : ''
}

export function sortISODateDesc(a: string, b: string): number {
  return b.localeCompare(a)
}

export function parseMonthKey(monthKey: `${number}-${number}`): Date {
  return parseISODateLocal(`${monthKey}-01`)
}
