'use client'
import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Store,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Ventas', href: '/dashboard/ventas', icon: ShoppingCart },
  { label: 'Productos', href: '/dashboard/productos', icon: Package },
  { label: 'Clientes', href: '/dashboard/clientes', icon: Users },
  { label: 'Configuración', href: '/dashboard/configuracion', icon: Settings },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname?.startsWith(href) ?? false
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1 p-3" aria-label="Navegación principal">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
            <ChevronRight
              className={cn(
                'ml-auto size-4 transition-opacity',
                active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
              )}
            />
          </Link>
        )
      })}
    </nav>
  )
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-2 px-5 py-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Store className="size-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold leading-tight">POS Admin</span>
        <span className="text-xs text-muted-foreground leading-tight">Console remoto</span>
      </div>
    </div>
  )
}

function UserFooter() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const handleLogout = async () => {
    await logout()
    router.replace('/login')
  }
  return (
    <div className="mt-auto border-t p-3">
      <div className="flex items-center gap-3 rounded-lg p-2">
        <Avatar>
          <AvatarFallback>{getInitials(user?.displayName || user?.email || 'A')}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{user?.displayName || user?.email}</p>
          <p className="truncate text-xs text-muted-foreground capitalize">
            {user?.role || 'admin'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-card"
        aria-label="Barra lateral"
      >
        <BrandHeader />
        <Separator />
        <NavLinks />
        <UserFooter />
      </aside>

      {/* Mobile top bar with sheet trigger */}
      <div className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="size-4" />
          </div>
          <span className="text-sm font-semibold">POS Admin</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Abrir menú">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[80vw] p-0">
            <div className="flex h-full flex-col">
              <BrandHeader />
              <Separator />
              <SheetHeader className="sr-only">
                <SheetTitle>Menú de navegación</SheetTitle>
                <SheetDescription>Selecciona una sección</SheetDescription>
              </SheetHeader>
              <NavLinks onNavigate={() => setOpen(false)} />
              <UserFooter />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
