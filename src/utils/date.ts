import { format, parse, isSameYear, isSameMonth } from 'date-fns'

export const YMD = 'yyyy-MM-dd'
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/

export function isYmd(value: unknown): value is string {
  return typeof value === 'string' && YMD_RE.test(value)
}

// Parse a local calendar date from a 'yyyy-MM-dd' string
export function parseYmd(ymd: string, fallback: Date = new Date()): Date {
  return parse(ymd, YMD, fallback)
}

// Format a Date or a 'yyyy-MM-dd' string in local time
export function formatDate(input: Date | string, pattern: string): string {
  const d = typeof input === 'string' && isYmd(input) ? parseYmd(input) : new Date(input)
  return format(d, pattern)
}

// Today in local 'yyyy-MM-dd'
export function todayYmd(date: Date = new Date()): string {
  return format(date, YMD)
}

// Human-friendly date range formatting.
// Examples:
// - Sep 1–3, 2025
// - Aug 30 – Sep 3, 2025
// - Dec 31, 2024 – Jan 2, 2025
export function formatDateRange(start: Date | string, end: Date | string): string {
  if (!start || !end) return ''
  const s = typeof start === 'string' && isYmd(start) ? parseYmd(start) : new Date(start)
  const e = typeof end === 'string' && isYmd(end) ? parseYmd(end) : new Date(end)
  
  // If start and end are the same date, show single date
  if (format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd')) {
    return format(s, 'MMM d, yyyy')
  }
  
  if (isSameYear(s, e)) {
    if (isSameMonth(s, e)) {
      return `${format(s, 'MMM d')}–${format(e, 'd, yyyy')}`
    }
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  }
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`
}
