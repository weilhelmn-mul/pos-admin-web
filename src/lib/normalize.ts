// Helpers para normalizar datos provenientes de Firebase.
// Resuelve mismatches entre lo que el POS Pro escribe y lo que la web espera leer.

/**
 * Obtiene un Date desde cualquier formato de fecha que venga de Firebase.
 * Soporta:
 * - Firestore Timestamp (con toDate())
 * - Objeto serializado {_seconds, _nanoseconds}
 * - ISO string
 * - Number (epoch ms)
 * - Date ya construido
 */
export function toDate(value: any): Date | null {
  if (!value) return null
  // Firestore Timestamp
  if (typeof value?.toDate === 'function') {
    try { return value.toDate() } catch { return null }
  }
  // Objeto {_seconds, _nanoseconds} (serializado desde Firestore)
  if (typeof value === 'object' && '_seconds' in value) {
    const ms = Number(value._seconds) * 1000 + Math.floor(Number(value._nanoseconds || 0) / 1_000_000)
    return new Date(ms)
  }
  // String ISO
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  // Number (epoch)
  if (typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  // Date
  if (value instanceof Date) return value
  return null
}

/**
 * Obtiene el número de comprobante de una venta, soportando ambos nombres.
 * POS Pro usa `invoiceNumber`, web legacy usa `number`.
 */
export function getInvoiceNumber(sale: any): string {
  return sale?.invoiceNumber || sale?.number || `#${sale?.id?.slice(0, 8) || '????'}`
}

/**
 * Obtiene el nombre del cliente desde una venta, soportando múltiples esquemas.
 * POS Pro guarda customerId (no nombre); el campo customerName se agregará en sync-service.
 */
export function getCustomerName(sale: any, customers: Array<{ id: string; name?: string }> = []): string {
  // 1. Nombre directo en la venta (agregado por sync-service con JOIN a customers)
  if (sale?.customerName) return sale.customerName
  // 2. Objeto embebido customer
  if (sale?.customer?.name) return sale.customer.name
  // 3. Lookup por customerId
  if (sale?.customerId) {
    const c = customers.find((c) => c.id === sale.customerId)
    if (c?.name) return c.name
  }
  return 'Cliente contado'
}

/**
 * Obtiene el documento del cliente (DNI/RUC) desde una venta.
 */
export function getCustomerDoc(sale: any, customers: Array<{ id: string; document?: string; dni?: string; ruc?: string }> = []): string {
  if (sale?.customerDoc) return sale.customerDoc
  if (sale?.customer?.document) return sale.customer.document
  if (sale?.customerId) {
    const c = customers.find((c) => c.id === sale.customerId)
    if (c?.document) return c.document
    if (c?.dni) return c.dni
    if (c?.ruc) return c.ruc
  }
  return '—'
}

/**
 * Obtiene el precio unitario de un item de venta, soportando ambos nombres.
 * POS Pro usa `unitPrice`, algunos schemas legacy usan `price`.
 */
export function getItemUnitPrice(item: any): number {
  return Number(item?.unitPrice ?? item?.price ?? 0)
}

/**
 * Obtiene el nombre del producto en un item de venta.
 */
export function getItemName(item: any): string {
  return item?.name || item?.productName || 'Producto'
}

/**
 * Obtiene el precio de un producto desde el documento en Firestore.
 * POS Pro usa `salePrice`; algunos productos viejos pueden tener `price`.
 */
export function getProductPrice(product: any): number {
  return Number(product?.salePrice ?? product?.price ?? 0)
}

/**
 * Obtiene el costo de un producto (para calcular valor de inventario).
 * POS Pro SQLite tiene `cost`, pero no siempre lo sube a Firestore.
 */
export function getProductCost(product: any): number {
  return Number(product?.cost ?? product?.purchasePrice ?? product?.price ?? 0)
}

/**
 * Obtiene la categoría de un producto, soportando ambos nombres.
 */
export function getProductCategory(product: any): string {
  return product?.category || product?.categoryName || 'Sin categoría'
}

/**
 * Obtiene la imagen del producto, soportando ambos nombres.
 */
export function getProductImage(product: any): string | undefined {
  return product?.image || product?.imageUrl || undefined
}

/**
 * Verifica si una venta está "cancelada/anulada" (no cuenta para ingresos).
 */
export function isSaleActive(sale: any): boolean {
  const status = (sale?.status || '').toLowerCase()
  return status !== 'voided' && status !== 'cancelled' && status !== 'refunded'
}

/**
 * Es hoy (en zona horaria de Perú, UTC-5)?
 * Compara solo año/mes/día en America/Lima.
 */
export function isToday(date: Date | null): boolean {
  if (!date) return false
  const peruDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Lima' }))
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }))
  return peruDate.getFullYear() === now.getFullYear()
    && peruDate.getMonth() === now.getMonth()
    && peruDate.getDate() === now.getDate()
}

/**
 * Es del mes actual (en zona horaria de Perú).
 */
export function isThisMonth(date: Date | null): boolean {
  if (!date) return false
  const peruDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Lima' }))
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }))
  return peruDate.getFullYear() === now.getFullYear()
    && peruDate.getMonth() === now.getMonth()
}

/**
 * Es de hoy en Lima (versión accepting Firestore timestamp or string).
 */
export function isTodayAny(value: any): boolean {
  return isToday(toDate(value))
}

export function isThisMonthAny(value: any): boolean {
  return isThisMonth(toDate(value))
}
