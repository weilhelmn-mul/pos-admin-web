'use client'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}
const DialogContext = React.createContext<DialogContextValue | null>(null)

export function Dialog({
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
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

function useDialog() {
  const ctx = React.useContext(DialogContext)
  if (!ctx) throw new Error('Dialog components must be used inside <Dialog>')
  return ctx
}

export function DialogTrigger({ asChild, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen } = useDialog()
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

export function DialogContent({
  className,
  children,
  hideClose,
}: {
  className?: string
  children: React.ReactNode
  hideClose?: boolean
}) {
  const { open, setOpen } = useDialog()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted || typeof document === 'undefined') return null
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
        onClick={() => setOpen(false)}
      />
      <div
        data-slot="dialog-content"
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg rounded-lg',
          className
        )}
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

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex flex-col gap-1.5 text-left', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-footer" className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 data-slot="dialog-title" className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="dialog-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function DialogClose() {
  return null
}
