'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import {
  Package,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  XCircle,
  DollarSign,
  X,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { formatCurrency, formatNumber } from '@/lib/format'
import { exportProductsToCSV } from '@/lib/export'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from '@/components/ui/toaster'

interface Product {
  id: string
  name?: string
  sku?: string
  barcode?: string
  price?: number
  salePrice?: number
  cost?: number
  purchasePrice?: number
  stock?: number
  minStock?: number
  category?: string
  categoryName?: string
  brand?: string
  unit?: string
  status?: string
  syncedAt?: any
  [k: string]: any
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')

  const load = async () => {
    if (!db) {
      toast.error({ title: 'Firebase no configurado' })
      setLoading(false)
      return
    }
    try {
      const snap = await getDocs(collection(db, 'products'))
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Product[]
      setProducts(items)
    } catch (e: any) {
      toast.error({ title: 'Error al cargar productos', description: e?.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      const c = p.category || p.categoryName
      if (c) set.add(c)
    })
    return Array.from(set).sort()
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      const cat = p.category || p.categoryName
      const matchesCategory = category === 'all' || cat === category
      const stock = Number(p.stock || 0)
      const min = Number(p.minStock || 5)
      let matchesStock = true
      if (stockFilter === 'out') matchesStock = stock <= 0
      else if (stockFilter === 'low') matchesStock = stock > 0 && stock <= min
      else if (stockFilter === 'ok') matchesStock = stock > min
      return matchesSearch && matchesCategory && matchesStock
    })
  }, [products, search, category, stockFilter])

  const totalProducts = products.length
  const lowStock = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= Number(p.minStock || 5)).length
  const outOfStock = products.filter((p) => Number(p.stock || 0) <= 0).length
  const inventoryValue = products.reduce(
    (sum, p) => sum + Number(p.stock || 0) * Number(p.cost || p.purchasePrice || 0),
    0
  )

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warning({ title: 'Sin datos', description: 'No hay productos para exportar' })
      return
    }
    exportProductsToCSV(filtered)
    toast.success({ title: 'CSV generado', description: `${filtered.length} productos exportados` })
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {totalProducts} productos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
            Refrescar
          </Button>
          <Button onClick={handleExport} disabled={loading || products.length === 0}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total productos"
          value={loading ? null : formatNumber(totalProducts)}
          icon={Package}
          color="emerald"
        />
        <SummaryCard
          title="Stock bajo"
          value={loading ? null : formatNumber(lowStock)}
          icon={AlertTriangle}
          color="amber"
        />
        <SummaryCard
          title="Agotados"
          value={loading ? null : formatNumber(outOfStock)}
          icon={XCircle}
          color="red"
        />
        <SummaryCard
          title="Valor inventario"
          value={loading ? null : formatCurrency(inventoryValue)}
          icon={DollarSign}
          color="sky"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Catálogo
          </CardTitle>
          <CardDescription>Sincronizado desde Firestore</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU, código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Buscar productos"
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
            <Select value={category} onValueChange={setCategory} className="sm:w-48">
              <SelectTrigger aria-label="Filtrar por categoría">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter} className="sm:w-44">
              <SelectTrigger aria-label="Filtrar por stock">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo</SelectItem>
                <SelectItem value="ok">Disponible</SelectItem>
                <SelectItem value="low">Stock bajo</SelectItem>
                <SelectItem value="out">Agotado</SelectItem>
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
              No se encontraron productos con los filtros actuales.
            </p>
          ) : (
            <div className="rounded-md border">
              <ScrollArea orientation="both" className="max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">Producto</TableHead>
                      <TableHead className="min-w-24">SKU</TableHead>
                      <TableHead className="min-w-28">Categoría</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="min-w-24">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((p) => {
                      const stock = Number(p.stock || 0)
                      const min = Number(p.minStock || 5)
                      const price = Number(p.price || p.salePrice || 0)
                      let variant: 'success' | 'warning' | 'destructive' | 'secondary' = 'secondary'
                      let label = p.status || 'activo'
                      if (stock <= 0) {
                        variant = 'destructive'
                        label = 'agotado'
                      } else if (stock <= min) {
                        variant = 'warning'
                        label = 'stock bajo'
                      } else {
                        variant = 'success'
                      }
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{p.name}</span>
                              {p.barcode && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {p.barcode}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.sku || '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {p.category || p.categoryName || '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-mono text-sm">{formatNumber(stock)}</span>
                            <span className="ml-1 text-xs text-muted-foreground">/{p.unit || 'UND'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={variant} className="capitalize">{label}</Badge>
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
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string | null
  icon: typeof Package
  color: 'emerald' | 'amber' | 'red' | 'sky'
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    sky: 'bg-sky-100 text-sky-700',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {value === null ? <Skeleton className="mt-1 h-6 w-20" /> : <p className="text-lg font-bold">{value}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
