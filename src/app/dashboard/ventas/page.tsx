'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import {
  ShoppingCart,
  Search,
  Download,
  RefreshCw,
  Eye,
  Loader2,
  X,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { exportSalesToCSV } from '@/lib/export'
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
  number?: string
  externalId?: string
  date?: any
  createdAt?: any
  total?: number
  subtotal?: number
  tax?: number
  igv?: number
  status?: string
  paymentMethod?: string
  customerName?: string
  customerDoc?: string
  customer?: { name?: string; document?: string }
  items?: Array<{ name?: string; productName?: string; quantity?: number; price?: number; unitPrice?: number; subtotal?: number }>
  userId?: string
  vendedor?: string
  syncedAt?: any
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
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<Sale | null>(null)

  const load = async () => {
    if (!db) {
      toast.error({ title: 'Firebase no configurado' })
      setLoading(false)
      return
    }
    try {
      const snap = await getDocs(collection(db, 'sales'))
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Sale[]
      setSales(items)
    } catch (e: any) {
      toast.error({ title: 'Error al cargar ventas', description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales
      .filter((s) => {
        const matchesSearch =
          !q ||
          (s.number || '').toLowerCase().includes(q) ||
          (s.customerName || s.customer?.name || '').toLowerCase().includes(q) ||
          (s.customerDoc || s.customer?.document || '').toLowerCase().includes(q) ||
          (s.id || '').toLowerCase().includes(q)
        const matchesStatus = status === 'all' || (s.status || '').toLowerCase() === status
        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        const da = a.date?.toDate ? a.date.toDate() : a.date ? new Date(a.date) : new Date(0)
        const db2 = b.date?.toDate ? b.date.toDate() : b.date ? new Date(b.date) : new Date(0)
        return db2.getTime() - da.getTime()
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

  const totalAmount = filtered.reduce((sum, s) => sum + Number(s.total || 0), 0)

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} ventas · Total {formatCurrency(totalAmount)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
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
                      const d = s.date?.toDate ? s.date.toDate() : s.date ? new Date(s.date) : null
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">
                            {s.number || s.id.slice(0, 8)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {d ? formatDateTime(d) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.customerName || s.customer?.name || 'Cliente contado'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.customerDoc || s.customer?.document || '—'}
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
              {selected?.number || selected?.id?.slice(0, 8)} ·{' '}
              {selected?.date?.toDate
                ? formatDateTime(selected.date.toDate())
                : selected?.date
                ? formatDateTime(new Date(selected.date))
                : '—'}
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
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Cliente" value={sale.customerName || sale.customer?.name || 'Cliente contado'} />
        <Field label="Documento" value={sale.customerDoc || sale.customer?.document || '—'} />
        <Field label="Método de pago" value={sale.paymentMethod || '—'} />
        <Field label="Estado" value={sale.status || '—'} />
        <Field label="Vendedor" value={sale.userId || sale.vendedor || '—'} />
        <Field
          label="Sincronizado"
          value={sale.syncedAt ? formatDateTime(sale.syncedAt.toDate ? sale.syncedAt.toDate() : new Date(sale.syncedAt)) : '—'}
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
                  const name = it.name || it.productName || 'Producto'
                  const qty = Number(it.quantity || 0)
                  const price = Number(it.price || it.unitPrice || 0)
                  const sub = Number(it.subtotal || qty * price)
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
