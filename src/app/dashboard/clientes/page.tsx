'use client'
import { useMemo, useState } from 'react'
import {
  Users,
  Search,
  Download,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  User,
  X,
  Radio,
} from 'lucide-react'
import { useFirestoreLive, formatRelativeTime } from '@/hooks/use-firestore-live'
import { formatCurrency } from '@/lib/format'
import { exportCustomersToCSV } from '@/lib/export'
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

interface Customer {
  id: string
  name?: string
  fullName?: string
  document?: string
  dni?: string
  ruc?: string
  docType?: string
  documentType?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  creditLimit?: number
  balance?: number
  syncedAt?: any
  [k: string]: any
}

export default function ClientesPage() {
  const [search, setSearch] = useState('')
  const [docFilter, setDocFilter] = useState('all')
  // Tiempo real via onSnapshot + polling 60s de respaldo
  const { data: customers, loading, lastUpdated, refresh, live } = useFirestoreLive<Customer>('customers', { pollIntervalMs: 60000 })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers.filter((c) => {
      const doc = c.document || c.dni || c.ruc || ''
      const matchesSearch =
        !q ||
        (c.name || c.fullName || '').toLowerCase().includes(q) ||
        doc.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      const docType = c.docType || c.documentType || (doc.length === 8 ? 'DNI' : doc.length === 11 ? 'RUC' : '')
      const matchesDoc = docFilter === 'all' || docType === docFilter
      return matchesSearch && matchesDoc
    })
  }, [customers, search, docFilter])

  const total = customers.length
  const withEmail = customers.filter((c) => !!c.email).length
  const withPhone = customers.filter((c) => !!c.phone).length
  const empresas = customers.filter((c) => {
    const doc = c.document || c.dni || c.ruc || ''
    const docType = c.docType || c.documentType || (doc.length === 8 ? 'DNI' : doc.length === 11 ? 'RUC' : '')
    return docType === 'RUC'
  }).length

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warning({ title: 'Sin datos', description: 'No hay clientes para exportar' })
      return
    }
    exportCustomersToCSV(filtered)
    toast.success({ title: 'CSV generado', description: `${filtered.length} clientes exportados` })
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {total} clientes
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
          <Button onClick={handleExport} disabled={loading || customers.length === 0}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </div>
      </header>

      {/* Summary cards */}
      <section className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total clientes" value={loading ? null : total.toString()} icon={User} color="emerald" />
        <SummaryCard title="Con email" value={loading ? null : withEmail.toString()} icon={Mail} color="sky" />
        <SummaryCard title="Con teléfono" value={loading ? null : withPhone.toString()} icon={Phone} color="amber" />
        <SummaryCard title="Empresas (RUC)" value={loading ? null : empresas.toString()} icon={Building2} color="violet" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Directorio
          </CardTitle>
          <CardDescription>Sincronizado desde Firestore</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, DNI/RUC, email, teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                aria-label="Buscar clientes"
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
            <Select value={docFilter} onValueChange={setDocFilter} className="sm:w-44">
              <SelectTrigger aria-label="Filtrar por tipo de documento">
                <SelectValue placeholder="Tipo doc." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="RUC">RUC</SelectItem>
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
              No se encontraron clientes con los filtros actuales.
            </p>
          ) : (
            <div className="rounded-md border">
              <ScrollArea orientation="both" className="max-h-[70vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">Nombre</TableHead>
                      <TableHead className="min-w-20">Tipo</TableHead>
                      <TableHead className="min-w-32">Documento</TableHead>
                      <TableHead className="min-w-36">Email</TableHead>
                      <TableHead className="min-w-28">Teléfono</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => {
                      const doc = c.document || c.dni || c.ruc || ''
                      const docType = c.docType || c.documentType || (doc.length === 8 ? 'DNI' : doc.length === 11 ? 'RUC' : '')
                      const balance = Number(c.balance || 0)
                      return (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {c.name || c.fullName || 'Sin nombre'}
                              </span>
                              {c.city && (
                                <span className="text-xs text-muted-foreground">
                                  {c.city}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={docType === 'RUC' ? 'default' : 'secondary'}>
                              {docType || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {doc || '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.email || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.phone || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {balance !== 0 ? (
                              <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                                {formatCurrency(balance)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">S/ 0.00</span>
                            )}
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
  icon: typeof Users
  color: 'emerald' | 'sky' | 'amber' | 'violet'
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-700',
    sky: 'bg-sky-100 text-sky-700',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-violet-100 text-violet-700',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <div className={`flex size-10 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon className="size-5" />
        </div>
        <div className="flex flex-col">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {value === null ? <Skeleton className="mt-1 h-6 w-16" /> : <p className="text-lg font-bold">{value}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
