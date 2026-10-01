'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Store,
  Mail,
  Lock,
  Loader2,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function LoginPage() {
  const { user, loading, login, resetPassword } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'reset'>('login')
  const [email, setEmail] = useState('admin@pos-creard.com')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // If already logged in, push to dashboard
  if (!loading && user) {
    router.replace('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast.success({ title: 'Bienvenido', description: 'Sesión iniciada correctamente' })
        router.replace('/dashboard')
      } else {
        await resetPassword(email)
        toast.success({
          title: 'Correo enviado',
          description: `Revisa la bandeja de ${email} para restablecer la contraseña`,
        })
        setMode('login')
      }
    } catch (err: any) {
      toast.error({ title: 'Error', description: err?.message || 'Operación fallida' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-background to-emerald-100 p-4 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Store className="size-7" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">POS Admin</h1>
            <p className="text-sm text-muted-foreground">
              Consola remota de administración
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Ingresa tus credenciales de Firebase Auth'
                : 'Te enviaremos un correo para restablecer tu contraseña'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="admin@pos-creard.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {mode === 'login' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="self-end text-xs font-medium text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {mode === 'login' ? 'Ingresar' : 'Enviar correo'}
              </Button>
              {mode === 'reset' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode('login')}
                  className="w-full"
                >
                  <ArrowLeft className="size-4" />
                  Volver a iniciar sesión
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Proyecto: <code className="font-mono">pos-creard</code> ·
          <span> Firebase Auth + Firestore</span>
        </p>
      </div>
    </main>
  )
}
