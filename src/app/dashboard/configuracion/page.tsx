'use client'
import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import {
  Settings as SettingsIcon,
  Database,
  User as UserIcon,
  Store,
  Save,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { db, isFirebaseConfigured } from '@/lib/firebase'
import { useAuth } from '@/hooks/use-auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/toaster'

interface StoreSettings {
  name: string
  ruc: string
  address: string
  phone: string
  email: string
  currency: string
  legalName: string
  website: string
}

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Mi Negocio SAC',
  ruc: '',
  address: '',
  phone: '',
  email: '',
  currency: 'PEN',
  legalName: '',
  website: '',
}

export default function ConfiguracionPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [checkingConn, setCheckingConn] = useState(false)
  const [connOk, setConnOk] = useState<boolean | null>(null)

  const loadSettings = async () => {
    if (!db) {
      setLoading(false)
      return
    }
    try {
      const snap = await getDoc(doc(db, 'settings', 'store'))
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...(snap.data() as any) })
      }
    } catch (e: any) {
      console.error('[settings] load', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) {
      toast.error({ title: 'Firebase no configurado' })
      return
    }
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'store'), settings, { merge: true })
      toast.success({ title: 'Guardado', description: 'La configuración del negocio fue actualizada' })
    } catch (err: any) {
      toast.error({ title: 'Error al guardar', description: err?.message })
    } finally {
      setSaving(false)
    }
  }

  const copyUid = async () => {
    if (!user?.uid) return
    try {
      await navigator.clipboard.writeText(user.uid)
      setCopied(true)
      toast.success({ title: 'UID copiado', description: 'Pégalo donde lo necesites' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error({ title: 'No se pudo copiar' })
    }
  }

  const testConnection = async () => {
    setCheckingConn(true)
    try {
      if (!db) {
        setConnOk(false)
        toast.error({ title: 'Sin configuración' })
        return
      }
      // Read a tiny collection to test connectivity
      const { collection, getDocs, limit, query } = await import('firebase/firestore')
      await getDocs(query(collection(db, '_health_check'), limit(1)))
      setConnOk(true)
      toast.success({ title: 'Conexión OK', description: 'Firestore accesible' })
    } catch (e: any) {
      setConnOk(false)
      toast.error({ title: 'Conexión fallida', description: e?.message })
    } finally {
      setCheckingConn(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-sm text-muted-foreground">
            Ajustes del sistema y de la conexión a la nube
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Firebase connection card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Conexión a Firebase
            </CardTitle>
            <CardDescription>
              Estado de la conexión con el proyecto <code className="font-mono text-xs">pos-creard</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
              <div className="flex items-center gap-3">
                {isFirebaseConfigured() ? (
                  <ShieldCheck className="size-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="size-5 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isFirebaseConfigured() ? 'Configurado' : 'No configurado'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Sin project ID'}
                  </p>
                </div>
              </div>
              <Badge variant={isFirebaseConfigured() ? 'success' : 'warning'}>
                {isFirebaseConfigured() ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>

            <Button variant="outline" onClick={testConnection} disabled={checkingConn}>
              {checkingConn ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
              Probar conexión
            </Button>

            {connOk !== null && (
              <div
                className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                  connOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {connOk ? (
                  <ShieldCheck className="size-4" />
                ) : (
                  <AlertTriangle className="size-4" />
                )}
                <span>
                  {connOk
                    ? 'Firestore responde correctamente'
                    : 'No se pudo conectar con Firestore'}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-medium">Endpoints de sincronización</h4>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <code className="rounded bg-muted px-2 py-1 font-mono">GET /api/sync</code>
                <code className="rounded bg-muted px-2 py-1 font-mono">POST /api/sync</code>
                <code className="rounded bg-muted px-2 py-1 font-mono">GET /api/sales?limit=100</code>
                <code className="rounded bg-muted px-2 py-1 font-mono">GET /api/products</code>
                <code className="rounded bg-muted px-2 py-1 font-mono">GET /api/customers</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User info card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="size-5" />
              Usuario actual
            </CardTitle>
            <CardDescription>Información de tu cuenta Firebase Auth</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user?.displayName || user?.email}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">UID (identificador único)</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-2 font-mono text-xs">
                  {user?.uid}
                </code>
                <Button variant="outline" size="icon" onClick={copyUid} aria-label="Copiar UID">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Permisos</Label>
              <div className="flex flex-wrap gap-1">
                {user?.permissions?.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs font-mono">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store settings form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="size-5" />
            Datos del negocio
          </CardTitle>
          <CardDescription>
            Información que aparece en comprobantes y documentos. Se guarda en{' '}
            <code className="font-mono text-xs">settings/store</code>.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <FieldInput
              label="Nombre comercial"
              value={settings.name}
              onChange={(v) => setSettings({ ...settings, name: v })}
              placeholder="Mi Negocio SAC"
              required
            />
            <FieldInput
              label="Razón social"
              value={settings.legalName}
              onChange={(v) => setSettings({ ...settings, legalName: v })}
              placeholder="MI NEGOCIO S.A.C."
            />
            <FieldInput
              label="RUC"
              value={settings.ruc}
              onChange={(v) => setSettings({ ...settings, ruc: v })}
              placeholder="20512345678"
              maxLength={11}
            />
            <FieldInput
              label="Teléfono"
              value={settings.phone}
              onChange={(v) => setSettings({ ...settings, phone: v })}
              placeholder="+51 999 888 777"
            />
            <FieldInput
              label="Email"
              type="email"
              value={settings.email}
              onChange={(v) => setSettings({ ...settings, email: v })}
              placeholder="ventas@minegocio.pe"
            />
            <FieldInput
              label="Sitio web"
              value={settings.website}
              onChange={(v) => setSettings({ ...settings, website: v })}
              placeholder="https://minegocio.pe"
            />
            <FieldInput
              label="Moneda"
              value={settings.currency}
              onChange={(v) => setSettings({ ...settings, currency: v })}
              placeholder="PEN"
            />
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="address">Dirección fiscal</Label>
              <Input
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Av. Principal 123, Lima, Perú"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={loadSettings} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar cambios
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  maxLength?: number
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
      />
    </div>
  )
}
