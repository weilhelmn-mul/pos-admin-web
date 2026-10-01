// Format helpers for currency, dates and numbers (es-PE locale by default)

export function formatCurrency(value: number | undefined | null, currency = 'PEN'): string {
  if (value === undefined || value === null || isNaN(Number(value))) return 'S/ 0.00'
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(value))
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(Number(value))) return '0'
  return new Intl.NumberFormat('es-PE').format(Number(value))
}

export function formatDate(d: Date | any, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return '—'
  const date = d?.toDate ? d.toDate() : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-PE', opts || { year: 'numeric', month: 'short', day: '2-digit' }).format(date)
}

export function formatDateTime(d: Date | any): string {
  if (!d) return '—'
  const date = d?.toDate ? d.toDate() : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}
