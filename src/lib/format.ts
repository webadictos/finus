import {
  diffCalendarDays,
  formatISODateForLocale,
} from '@/lib/local-date'

export function formatMXN(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto)
}

export function formatFecha(fecha: string): string {
  return formatISODateForLocale(fecha, {
    day: 'numeric',
    month: 'short',
  })
}

export function diasHastaFecha(fecha: string): number {
  return diffCalendarDays(fecha)
}
