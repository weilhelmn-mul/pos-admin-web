'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (user) router.replace('/dashboard')
    else router.replace('/login')
  }, [user, loading, router])

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background"
      role="status"
      aria-live="polite"
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <Store className="size-7" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">POS Admin</p>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
      <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </main>
  )
}
