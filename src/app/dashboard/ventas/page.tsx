'use client'
import { useMemo, useState } from 'react'
import {
  ShoppingCart,
  Search,
  Download,
  RefreshCw,
  Eye,
  Loader2,
  X,
  Radio,
} from 'lucide-react'
import { useFirestoreLive, formatRelativeTime } from '@/hooks/use-firestore-live'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { exportSalesToCSV } from '@/lib/export'
import {
  toDate, getInvoiceNumber, getCustomerName, getCustomerDoc,
  getItemName, getItemUnitPrice, isSaleActive, isTodayAny,
} from '@/lib/normalize'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toaster'

interface Sale {
  id: string
  // Campos reales guardados por POS Pro:
  externalId?: string
  invoiceNumber?: string  // POS Pro usa este (NO 'number')
  number?: string         // alias legacy
  date?: any             // alias legacy para createdAt
  createdAt?: any        // campo real que usa POS Pro (Firestore Timestamp)
  updatedAt?: any
  total?: number
  subtotal?: number
  tax?: number
  igv?: number
  discount?: number
  status?: string
  paymentMethod?: string
  customerId?: string | null
  customerName?: string  // Se agregará en sync-service del POS Pro
  customerDoc?: string
  customer?: { name?: string; document?: string }
  items?: Array<{ id?: string; productId?: string; name?: string; productName?: string; quantity?: number; unitPrice?: number; price?: number; subtotal?: number; discount?: number; total?: number }>
  payments?: Array<{ id?: string; method?: string; amount?: number; reference?: string; createdAt?: any }>
  userId?: string
  userName?: string      // Se agregará en sync-service del POS Pro
  vendedor?: string
  syncedAt?: any
  syncStatus?: string
  syncedBy?: string
  source?: string
  [k: string]: any
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'completed', label: 'Completadas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'voided', label: 'Anuladas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'refunded', label: 'Reembolsadas' },
]

export default function VentasPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<Sale | null>(null)

  // Tiempo real via onSnapshot + polling 60s de respaldo
  // Cada venta nueva en el POS dispara onSnapshot automáticamente
  const { data: sales, loading, lastUpdated, refresh, live } = useFirestoreLive<Sale>('sales', { pollIntervalMs: 60000 })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales
      .filter((s) => {
        // Soporta ambos nombres: invoiceNumber (real POS Pro) y number (legacy)
        const invNum = getInvoiceNumber(s).toLowerCase()
        const custName = getCustomerName(s).toLowerCase()
        const custDoc = getCustomerDoc(s).toLowerCase()
        const matchesSearch =
          !q ||
          invNum.includes(q) ||
          custName.includes(q) ||
          custDoc.includes(q) ||
          (s.id || '').toLowerCase().includes(q)
        const matchesStatus = status === 'all' || (s.status || '').toLowerCase() === status
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        // Usa createdAt (real) con fallback a date (legacy)
        const da = toDate(a.createdAt || a.date)
        const db2 = toDate(b.createdAt || b.date)
        return (db2?.getTime() || 0) - (da?.getTime() || 0)
      })
  }, [sales, search, status])

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warning({ title: 'Sin datos', description: 'No hay ventas para exportar' })
      return
    }
    exportSalesToCSV(filtered)
    toast.success({ title: 'CSV generado', description: `${filtered.length} ventas exportadas` })
  }

  const totalAmount = filtered.filter(isSaleActive).reduce((sum, s) => sum + Number(s.total || 0), 0)
  const todayCount = filtered.filter((s) => isTodayAny(s.createdAt || s.date)).length
  const todayTotal = filtered.filter((s) => isSaleActive(s) && isTodayAny(s.createdAt || s.date)).reduce((sum, s) => sum + Number(s.total || 0), 0)

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} ventas · Total {formatCurrency(totalAmount)} · Hoy {todayCount} ({formatCurrency(todayTotal)})
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge variant="outline" className={`gap-1.5 ${live ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <Radio className={`size-3 ${live ? 'animate-pulse' : ''}`} />
            {live ? 'En vivo' : 'Polling 60s'}
            {lastUpdated && <span className="text-[10px] text-muted-foreground">· {formatRelativeTime(lastUpdated)}</span>}
          </Badge>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            Refrescar
          </Button>
          <Button onClick={handleExport} disabled={loading || sales.length === 0}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5" />
            Historial de ventas
          </CardTitle>
          <CardDescription>Sincronizado desde Firestore</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente, DNI/RUC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Buscar ventas"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Select value={status} onValueChange={setStatus} className="sm:w-56">
              <SelectTrigger aria-label="Filtrar por estado">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No se encontraron ventas con los filtros actuales.
            </p>
          ) : (
            <div className="rounded-md border">
              <ScrollArea orientation="both" className="max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-32">Número</TableHead>
                      <TableHead className="min-w-36">Fecha</TableHead>
                      <TableHead className="min-w-40">Cliente</TableHead>
                      <TableHead className="min-w-28">Doc.</TableHead>
                      <TableHead className="min-w-28">Pago</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="min-w-24">Estado</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => {
                      const d = toDate(s.createdAt || s.date)
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">
                            {getInvoiceNumber(s)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {d ? formatDateTime(d) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getCustomerName(s)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {getCustomerDoc(s)}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary">{s.paymentMethod || '—'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(s.total || 0)}
                          </TableCell>
                          <TableCell>
                            <SaleStatusBadge status={s.status} />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelected(s)}
                              aria-label="Ver detalle"
                            >
                              <Eye className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de venta</DialogTitle>
            <DialogDescription>
              {selected ? getInvoiceNumber(selected) : ''} ·{' '}
              {(() => {
                const d = selected ? toDate(selected.createdAt || selected.date) : null
                return d ? formatDateTime(d) : '—'
              })()}
            </DialogDescription>
          </DialogHeader>
          {selected && <SaleDetail sale={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SaleDetail({ sale }: { sale: Sale }) {
  const items = Array.isArray(sale.items) ? sale.items : []
  const syncedAtDate = toDate(sale.syncedAt)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Cliente" value={getCustomerName(sale)} />
        <Field label="Documento" value={getCustomerDoc(sale)} />
        <Field label="Método de pago" value={sale.paymentMethod || '—'} />
        <Field label="Estado" value={sale.status || '—'} />
        <Field label="Vendedor" value={sale.userName || sale.vendedor || sale.userId || '—'} />
        <Field
          label="Sincronizado"
          value={syncedAtDate ? formatDateTime(syncedAtDate) : '—'}
        />
      </div>

      {items.length > 0 && (
        <div className="rounded-md border">
          <ScrollArea orientation="both" className="max-h-60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => {
                  const name = getItemName(it)
                  const qty = Number(it.quantity || 0)
                  const price = getItemUnitPrice(it)
                  const sub = Number(it.total || it.subtotal || qty * price)
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{name}</TableCell>
                      <TableCell className="text-right text-sm">{qty}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(price)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(sub)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      <div className="flex flex-col gap-1 rounded-md bg-muted/40 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">{formatCurrency(sale.subtotal || 0)}</span>
        </div>
        {sale.discount ? (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Descuento</span>
            <span className="font-medium">-{formatCurrency(sale.discount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Impuesto (IGV)</span>
          <span className="font-medium">{formatCurrency(sale.tax || sale.igv || 0)}</span>
        </div>
        <div className="flex justify-between border-t pt-1 mt-1">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold">{formatCurrency(sale.total || 0)}</span>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium break-words">{value}</span>
    </div>
  )
}

function SaleStatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>
  const map: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
    completed: 'success',
    paid: 'success',
    pending: 'warning',
    voided: 'destructive',
    cancelled: 'destructive',
    refunded: 'destructive',
  }
  const variant = map[status.toLowerCase()] || 'secondary'
  return <Badge variant={variant}>{status}</Badge>
}
