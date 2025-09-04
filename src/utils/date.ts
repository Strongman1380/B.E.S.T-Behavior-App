import { format, parse } from 'date-fns'

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

