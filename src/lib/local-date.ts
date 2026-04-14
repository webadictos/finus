export type ISODateString = `${number}-${number}-${number}`

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function parseISODateLocal(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0)
}

export function formatISODateLocal(date: Date): ISODateString {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` as ISODateString
}

export function getTodayLocalISO(now = new Date()): ISODateString {
  return formatISODateLocal(now)
}

export function getYesterdayLocalISO(now = new Date()): ISODateString {
  const date = new Date(now)
  date.setDate(date.getDate() - 1)
  return formatISODateLocal(date)
}

export function addDaysLocal(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addDaysToISODate(value: string, days: number): ISODateString {
  return formatISODateLocal(addDaysLocal(parseISODateLocal(value), days))
}

export function addMonthsToISODate(value: string, months: number): ISODateString {
  const next = parseISODateLocal(value)
  next.setMonth(next.getMonth() + months)
  return formatISODateLocal(next)
}

export function formatISODateForLocale(
  value: string,
  options: Intl.DateTimeFormatOptions,
  locale = 'es-MX'
): string {
  return parseISODateLocal(value).toLocaleDateString(locale, options)
}

export function diffCalendarDays(
  targetDate: string,
  baseDate = getTodayLocalISO()
): number {
  const target = parseISODateLocal(targetDate)
  const base = parseISODateLocal(baseDate)
  return Math.ceil((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24))
}

export function getCurrentMonthKey(now = new Date()): `${number}-${number}` {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}` as `${number}-${number}`
}

export function sortByISODateDesc(a: string, b: string): number {
  return b.localeCompare(a)
}

export function getStartOfMonthISO(now = new Date()): ISODateString {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01` as ISODateString
}

export function getEndOfMonthISO(now = new Date()): ISODateString {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return formatISODateLocal(lastDay)
}
