'use client'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface SheetContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}
const SheetContext = React.createContext<SheetContextValue | null>(null)

export function Sheet({
  open: openProp,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : internalOpen
  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setInternalOpen(v)
      onOpenChange?.(v)
    },
    [isControlled, onOpenChange]
  )
  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>
}

function useSheet() {
  const ctx = React.useContext(SheetContext)
  if (!ctx) throw new Error('Sheet components must be used inside <Sheet>')
  return ctx
}

export function SheetTrigger({ asChild, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen } = useSheet()
  const Comp: any = asChild ? 'span' : 'button'
  return (
    <Comp
      onClick={(e: any) => {
        props.onClick?.(e)
        setOpen(true)
      }}
      {...props}
    >
      {children}
    </Comp>
  )
}

export function SheetContent({
  side = 'right',
  className,
  children,
  hideClose,
}: {
  side?: 'left' | 'right' | 'top' | 'bottom'
  className?: string
  children: React.ReactNode
  hideClose?: boolean
}) {
  const { open, setOpen } = useSheet()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])
  if (!mounted || typeof document === 'undefined' || !open) return null
  const sideClasses: Record<string, string> = {
    right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l',
    left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r',
    top: 'inset-x-0 top-0 max-h-[80vh] w-full border-b',
    bottom: 'inset-x-0 bottom-0 max-h-[80vh] w-full border-t',
  }
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setOpen(false)} />
      <div
        data-slot="sheet-content"
        role="dialog"
        aria-modal="true"
        className={cn('absolute bg-background p-6 shadow-lg', sideClasses[side], className)}
      >
        {!hideClose && (
          <button
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
            onClick={() => setOpen(false)}
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

export function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
}

export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2', className)} {...props} />
}

export function SheetTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="sheet-title" className={cn('text-lg font-semibold text-foreground', className)} {...props} />
}

export function SheetDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}
