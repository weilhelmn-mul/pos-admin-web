'use client'
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
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
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toaster'

interface SaleDoc {
  id: string
  number?: string
  total?: number
  date?: any
  createdAt?: any
  status?: string
  customerName?: string
  paymentMethod?: string
  syncedAt?: any
}

interface ProductDoc {
  id: string
  name?: string
  price?: number
  stock?: number
  category?: string
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
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    if (!db) {
      toast.error({ title: 'Firebase no configurado', description: 'Verifica variables NEXT_PUBLIC_FIREBASE_*' })
      setLoading(false)
      return
    }
    try {
      const [salesSnap, productsSnap, customersSnap] = await Promise.all([
        getDocs(collection(db, 'sales')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'customers')),
      ])
      const sales: SaleDoc[] = salesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      const products: ProductDoc[] = productsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      const customers: CustomerDoc[] = customersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
      setData({ sales, products, customers })
    } catch (e: any) {
      toast.error({ title: 'Error al cargar datos', description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefresh = async () => {
    setSyncing(true)
    await load()
    setSyncing(false)
    toast.success({ title: 'Actualizado', description: 'Datos refrescados desde Firestore' })
  }

  const totalSales = data?.sales.length ?? 0
  const totalRevenue =
    data?.sales
      .filter((s) => s.status !== 'voided' && s.status !== 'cancelled')
      .reduce((sum, s) => sum + Number(s.total || 0), 0) ?? 0

  // Current month revenue
  const now = new Date()
  const monthRevenue =
    data?.sales
      .filter((s) => {
        const d = s.date?.toDate ? s.date.toDate() : s.date ? new Date(s.date) : null
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, s) => sum + Number(s.total || 0), 0) ?? 0

  const totalProducts = data?.products.length ?? 0
  const totalCustomers = data?.customers.length ?? 0

  const recentSales = [...(data?.sales || [])]
    .sort((a, b) => {
      const da = a.date?.toDate ? a.date.toDate() : a.date ? new Date(a.date as any) : new Date(0)
      const db2 = b.date?.toDate ? b.date.toDate() : b.date ? new Date(b.date as any) : new Date(0)
      return db2.getTime() - da.getTime()
    })
    .slice(0, 5)

  // Top products by units sold
  const productUnits = new Map<string, { name: string; units: number }>()
  for (const s of data?.sales || []) {
    const items = (s as any).items || []
    for (const it of items) {
      const name = it.name || it.productName || 'Producto'
      const qty = Number(it.quantity || 0)
      const cur = productUnits.get(name) || { name, units: 0 }
      cur.units += qty
      productUnits.set(name, cur)
    }
  }
  const topProducts = Array.from(productUnits.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)

  const syncedSales = data?.sales.filter((s) => s.syncedAt).length ?? 0
  const syncedProducts = data?.products.filter((p) => p.syncedAt).length ?? 0
  const syncedCustomers = data?.customers.filter((c) => c.syncedAt).length ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resumen general</h1>
          <p className="text-sm text-muted-foreground">
            Hola <span className="font-medium">{user?.displayName || user?.email}</span>. Vista de tu negocio.
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={syncing}>
          <RefreshCw className={syncing ? 'size-4 animate-spin' : 'size-4'} />
          Actualizar
        </Button>
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
          hint={now.toLocaleString('es-PE', { month: 'long', year: 'numeric' })}
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
                  const d = s.date?.toDate ? s.date.toDate() : s.date ? new Date(s.date as any) : null
                  return (
                    <li key={s.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {s.number || s.id.slice(0, 8)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.customerName || 'Cliente contado'} ·{' '}
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
