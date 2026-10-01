'use client'
import { useEffect, useState } from 'react'
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
  Radio,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useFirestoreLive, formatRelativeTime } from '@/hooks/use-firestore-live'
import { formatCurrency, formatDateTime } from '@/lib/format'
import {
  toDate, getInvoiceNumber, getCustomerName, isSaleActive,
  isThisMonthAny, getItemName, getProductPrice, isTodayAny,
} from '@/lib/normalize'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'

interface SaleDoc {
  id: string
  // POS Pro guarda: invoiceNumber, createdAt, paymentMethod, customerId, customerName (a agregar)
  // La web debe leer estos campos reales, NO number/date
  invoiceNumber?: string
  number?: string // alias legacy
  total?: number
  subtotal?: number
  tax?: number
  discount?: number
  date?: any // alias legacy para createdAt
  createdAt?: any // campo real que usa POS Pro
  updatedAt?: any
  status?: string
  customerId?: string | null
  customerName?: string // Se agregará en sync-service.ts del POS Pro
  customerDoc?: string
  userId?: string
  paymentMethod?: string
  paymentDetails?: any
  items?: Array<{
    id?: string
    productId?: string
    name?: string
    productName?: string
    quantity?: number
    unitPrice?: number
    price?: number // alias legacy
    discount?: number
    total?: number
  }>
  payments?: Array<{ id?: string; method?: string; amount?: number; reference?: string; createdAt?: any }>
  paidAmount?: number
  creditBalance?: number
  observations?: string
  notes?: string
  voidedAt?: any
  voidReason?: string
  source?: string
  syncStatus?: string
  syncedAt?: any
  syncedBy?: string
  externalId?: string
}

interface ProductDoc {
  id: string
  name?: string
  barcode?: string
  sku?: string
  // POS Pro usa 'salePrice' en el schema. La web debe respetar este nombre.
  salePrice?: number
  price?: number // alias legacy (algunos productos viejos pueden tener price)
  cost?: number // POS Pro no lo sube a Firebase, se calcula 0 si no existe
  purchasePrice?: number
  stock?: number
  minStock?: number
  category?: string
  categoryName?: string
  status?: string
  image?: string
  imageUrl?: string
  unit?: string
  syncedAt?: any
}

interface CustomerDoc {
  id: string
  name?: string
  syncedAt?: any
}

interface DashboardData {
  sales: SaleDoc[]
  products: ProductDoc[]
  customers: CustomerDoc[]
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [syncing, setSyncing] = useState(false)
  // Tiempo real via onSnapshot + polling 60s de respaldo
  const salesHook = useFirestoreLive<SaleDoc>('sales', { pollIntervalMs: 60000 })
  const productsHook = useFirestoreLive<ProductDoc>('products', { pollIntervalMs: 60000 })
  const customersHook = useFirestoreLive<CustomerDoc>('customers', { pollIntervalMs: 60000 })
  const loading = salesHook.loading || productsHook.loading || customersHook.loading
  // Filtrar productos eliminados (soft-delete: status='discontinued') de los stats
  const activeProducts = productsHook.data.filter((p) => (p as any).status !== 'discontinued')
  const data: DashboardData | null = (salesHook.data.length || activeProducts.length || customersHook.data.length)
    ? { sales: salesHook.data, products: activeProducts, customers: customersHook.data }
    : null
  const lastUpdated = [salesHook.lastUpdated, productsHook.lastUpdated, customersHook.lastUpdated]
    .filter(Boolean)
    .sort((a, b) => b!.getTime() - a!.getTime())[0] || null
  const live = salesHook.live || productsHook.live || customersHook.live

  const handleRefresh = async () => {
    setSyncing(true)
    await Promise.all([salesHook.refresh(), productsHook.refresh(), customersHook.refresh()])
    setSyncing(false)
    toast.success({ title: 'Actualizado', description: 'Datos refrescados desde Firestore' })
  }

  const totalSales = data?.sales.length ?? 0
  // Total revenue = suma de ventas activas (no anuladas/canceladas)
  const totalRevenue =
    data?.sales
      .filter((s) => isSaleActive(s))
      .reduce((sum, s) => sum + Number(s.total || 0), 0) ?? 0

  // Revenue del mes actual (zona horaria Lima/Perú)
  const todayRevenue =
    data?.sales
      .filter((s) => isSaleActive(s) && isTodayAny(s.createdAt || s.date))
      .reduce((sum, s) => sum + Number(s.total || 0), 0) ?? 0
  const monthRevenue =
    data?.sales
      .filter((s) => isSaleActive(s) && isThisMonthAny(s.createdAt || s.date))
      .reduce((sum, s) => sum + Number(s.total || 0), 0) ?? 0
  const salesToday =
    data?.sales.filter((s) => isTodayAny(s.createdAt || s.date)).length ?? 0

  const totalProducts = data?.products.length ?? 0
  const lowStockCount = data?.products.filter((p) => {
    const stock = Number(p.stock ?? 0)
    const min = Number(p.minStock ?? 0)
    return stock > 0 && stock <= min
  }).length ?? 0
  const totalCustomers = data?.customers.length ?? 0

  // Ventas recientes = últimas 5 ordenadas por createdAt (realmente guardado por POS Pro)
  const recentSales = [...(data?.sales || [])]
    .sort((a, b) => {
      const da = toDate(a.createdAt || a.date)
      const db2 = toDate(b.createdAt || b.date)
      return (db2?.getTime() || 0) - (da?.getTime() || 0)
    })
    .slice(0, 5)

  // Top productos por unidades vendidas
  const productUnits = new Map<string, { name: string; units: number }>()
  for (const s of data?.sales || []) {
    if (!isSaleActive(s)) continue
    const items = (s as any).items || []
    for (const it of items) {
      const name = getItemName(it)
      const qty = Number(it.quantity || 0)
      const cur = productUnits.get(name) || { name, units: 0 }
      cur.units += qty
      productUnits.set(name, cur)
    }
  }
  const topProducts = Array.from(productUnits.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)

  const syncedSales = data?.sales.filter((s) => s.syncedAt || s.syncStatus === 'synced').length ?? 0
  const syncedProducts = data?.products.filter((p) => p.syncedAt || p.syncStatus === 'synced').length ?? 0
  const syncedCustomers = data?.customers.filter((c) => c.syncedAt || c.syncStatus === 'synced').length ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumen general</h1>
          <p className="text-sm text-muted-foreground">
            Hola <span className="font-medium">{user?.displayName || user?.email}</span>. Vista de tu negocio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador tiempo real */}
          <Badge variant="outline" className={`gap-1.5 ${live ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <Radio className={`size-3 ${live ? 'animate-pulse' : ''}`} />
            {live ? 'En vivo' : 'Polling 60s'}
            {lastUpdated && <span className="text-[10px] text-muted-foreground">· {formatRelativeTime(lastUpdated)}</span>}
          </Badge>
          <Button variant="outline" onClick={handleRefresh} disabled={syncing}>
            <RefreshCw className={syncing ? 'size-4 animate-spin' : 'size-4'} />
            Actualizar
          </Button>
        </div>
      </header>

      {/* Stat cards */}
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Ventas totales"
          value={loading ? null : totalSales.toString()}
          icon={ShoppingCart}
          color="emerald"
          hint="Registros en Firestore"
        />
        <StatCard
          title="Ingresos del mes"
          value={loading ? null : formatCurrency(monthRevenue)}
          icon={DollarSign}
          color="amber"
          hint={`${formatCurrency(todayRevenue)} hoy · ${salesToday} venta(s) hoy`}
        />
        <StatCard
          title="Productos"
          value={loading ? null : totalProducts.toString()}
          icon={Package}
          color="sky"
          hint="Catálogo sincronizado"
        />
        <StatCard
          title="Clientes"
          value={loading ? null : totalCustomers.toString()}
          icon={Users}
          color="violet"
          hint="Base de clientes"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent sales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-5" />
              Ventas recientes
            </CardTitle>
            <CardDescription>Últimas 5 ventas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentSales.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay ventas registradas todavía.
              </p>
            ) : (
              <ul className="divide-y">
                {recentSales.map((s) => {
                  const d = toDate(s.createdAt || s.date)
                  return (
                    <li key={s.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {getInvoiceNumber(s)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {getCustomerName(s, data?.customers || [])} ·{' '}
                          {d ? formatDateTime(d) : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatCurrency(s.total || 0)}
                        </span>
                        <StatusBadge status={s.status} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Sync status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="size-5" />
              Estado de sincronización
            </CardTitle>
            <CardDescription>POS Desktop ↔ Firestore</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SyncRow label="Ventas" synced={syncedSales} total={totalSales} />
            <SyncRow label="Productos" synced={syncedProducts} total={totalProducts} />
            <SyncRow label="Clientes" synced={syncedCustomers} total={totalCustomers} />
            <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/40 p-3">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">
                Datos en tiempo real desde Firestore. Las escrituras del POS Desktop
                aparecen aquí automáticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-5" />
            Top productos
          </CardTitle>
          <CardDescription>Los más vendidos por unidades</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay productos vendidos.
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  <Badge variant="secondary">{p.units} und</Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  hint,
}: {
  title: string
  value: string | null
  icon: typeof ShoppingCart
  color: 'emerald' | 'amber' | 'sky' | 'violet'
  hint?: string
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    sky: 'bg-sky-100 text-sky-700',
    violet: 'bg-violet-100 text-violet-700',
  }
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div className={`flex size-11 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="size-5" />
        </div>
        <div className="flex flex-1 flex-col">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {value === null ? (
            <Skeleton className="mt-1 h-7 w-24" />
          ) : (
            <p className="text-xl font-bold tracking-tight">{value}</p>
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function SyncRow({ label, synced, total }: { label: string; synced: number; total: number }) {
  const pct = total > 0 ? Math.round((synced / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {synced}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
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
