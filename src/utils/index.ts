
export function createPageUrl(pageName: string) {
  return '/' + pageName;
}

export function truncateDecimal(value: number | string | null | undefined, decimals: number = 2): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (decimals <= 0) return Math.trunc(num);
  const factor = 10 ** decimals;
  return Math.trunc(num * factor) / factor;
}

export function formatTruncated(value: number | string | null | undefined, decimals: number = 2): string {
  const truncated = truncateDecimal(value, decimals);
  return truncated.toFixed(decimals);
}

export { YMD, isYmd, parseYmd, formatDate, todayYmd, formatDateRange } from './date';
