// CSV export helpers that trigger browser download

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCSV).join(',')]
  for (const row of rows) {
    lines.push(row.map((c) => escapeCSV(c)).join(','))
  }
  return lines.join('\r\n')
}

function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  if (typeof window === 'undefined') return
  const blob = new Blob(['\ufeff' + content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportSalesToCSV(sales: any[]) {
  const headers = [
    'ID',
    'Número',
    'Fecha',
    'Cliente',
    'DNI/RUC',
    'Subtotal',
    'Impuesto',
    'Total',
    'Método',
    'Estado',
    'Items',
    'Vendedor',
    'Sincronizado',
  ]
  const rows = sales.map((s) => [
    s.id ?? s.externalId ?? '',
    s.number ?? s.invoiceNumber ?? '',
    s.date ?? s.createdAt ?? '',
    s.customerName ?? s.customer?.name ?? '',
    s.customerDoc ?? s.customer?.document ?? '',
    s.subtotal ?? 0,
    s.tax ?? s.igv ?? 0,
    s.total ?? 0,
    s.paymentMethod ?? s.payment?.method ?? '',
    s.status ?? '',
    Array.isArray(s.items) ? s.items.length : s.itemCount ?? 0,
    s.userId ?? s.vendedor ?? '',
    s.syncedAt ?? '',
  ])
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadFile(buildCSV(headers, rows), `ventas-${ts}.csv`)
}

export function exportProductsToCSV(products: any[]) {
  const headers = [
    'ID',
    'SKU',
    'Código de barras',
    'Nombre',
    'Categoría',
    'Marca',
    'Precio venta',
    'Costo',
    'Stock',
    'Stock mínimo',
    'Unidad',
    'Estado',
    'Sincronizado',
  ]
  const rows = products.map((p) => [
    p.id ?? p.externalId ?? '',
    p.sku ?? '',
    p.barcode ?? '',
    p.name ?? '',
    p.category ?? p.categoryName ?? '',
    p.brand ?? '',
    p.price ?? p.salePrice ?? 0,
    p.cost ?? p.purchasePrice ?? 0,
    p.stock ?? 0,
    p.minStock ?? 0,
    p.unit ?? 'UND',
    p.status ?? '',
    p.syncedAt ?? '',
  ])
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadFile(buildCSV(headers, rows), `productos-${ts}.csv`)
}

export function exportCustomersToCSV(customers: any[]) {
  const headers = [
    'ID',
    'Nombre',
    'Tipo doc',
    'DNI/RUC',
    'Teléfono',
    'Email',
    'Dirección',
    'Ciudad',
    'Crédito máximo',
    'Saldo',
    'Sincronizado',
  ]
  const rows = customers.map((c) => [
    c.id ?? c.externalId ?? '',
    c.name ?? c.fullName ?? '',
    c.docType ?? c.documentType ?? (c.document?.length === 8 ? 'DNI' : 'RUC'),
    c.document ?? c.dni ?? c.ruc ?? '',
    c.phone ?? '',
    c.email ?? '',
    c.address ?? '',
    c.city ?? '',
    c.creditLimit ?? 0,
    c.balance ?? 0,
    c.syncedAt ?? '',
  ])
  const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  downloadFile(buildCSV(headers, rows), `clientes-${ts}.csv`)
}
