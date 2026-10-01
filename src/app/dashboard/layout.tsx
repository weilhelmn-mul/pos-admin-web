'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/toaster'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
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

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="main-content" className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
