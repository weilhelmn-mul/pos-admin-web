'use client'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  title?: string
  description?: string
  variant: ToastVariant
  duration: number
}

interface ToastOptions {
  title?: string
  description?: string
  duration?: number
  variant?: ToastVariant
}

const TOASTS: ToastItem[] = []
const LISTENERS: Set<(t: ToastItem[]) => void> = new Set()

function emit() {
  const copy = [...TOASTS]
  LISTENERS.forEach((l) => l(copy))
}

function push(opts: ToastOptions | string, variant: ToastVariant = 'default') {
  const options = typeof opts === 'string' ? { description: opts } : opts
  const item: ToastItem = {
    id: Math.random().toString(36).slice(2),
    title: options.title,
    description: options.description,
    variant: options.variant ?? variant,
    duration: options.duration ?? 4000,
  }
  TOASTS.push(item)
  emit()
  if (item.duration > 0) {
    setTimeout(() => {
      const i = TOASTS.findIndex((t) => t.id === item.id)
      if (i >= 0) {
        TOASTS.splice(i, 1)
        emit()
      }
    }, item.duration)
  }
  return item.id
}

export const toast = Object.assign(
  (opts: ToastOptions | string) => push(opts, 'default'),
  {
    success: (opts: ToastOptions | string) => push(opts, 'success'),
    error: (opts: ToastOptions | string) => push(opts, 'error'),
    warning: (opts: ToastOptions | string) => push(opts, 'warning'),
    info: (opts: ToastOptions | string) => push(opts, 'info'),
    dismiss: (id: string) => {
      const i = TOASTS.findIndex((t) => t.id === id)
      if (i >= 0) {
        TOASTS.splice(i, 1)
        emit()
      }
    },
  }
)

const ICONS: Record<ToastVariant, React.ElementType> = {
  default: Info,
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const COLORS: Record<ToastVariant, string> = {
  default: 'border-border bg-background text-foreground',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

export function Toaster({ className }: { className?: string }) {
  const [items, setItems] = React.useState<ToastItem[]>([])
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
    LISTENERS.add(setItems)
    return () => {
      LISTENERS.delete(setItems)
    }
  }, [])
  if (!mounted || typeof document === 'undefined') return null
  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-sm',
        className
      )}
    >
      {items.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2',
              COLORS[t.variant]
            )}
            role="status"
          >
            <Icon className="size-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-semibold text-sm">{t.title}</div>}
              {t.description && (
                <div className="text-sm opacity-90 break-words">{t.description}</div>
              )}
            </div>
            <button
              aria-label="Cerrar"
              className="opacity-60 hover:opacity-100"
              onClick={() => toast.dismiss(t.id)}
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body
  )
}

export { toast as sonnerToast }
