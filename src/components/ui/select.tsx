'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check, ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SelectContextValue {
  value: string
  setValue: (v: string) => void
  open: boolean
  setOpen: (v: boolean) => void
  options: Option[]
  registerOption: (o: Option) => void
}
const SelectContext = React.createContext<SelectContextValue | null>(null)

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  children: React.ReactNode
  className?: string
}

export function Select({ value: valueProp, defaultValue, onValueChange, children, className }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '')
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<Option[]>([])
  const isControlled = valueProp !== undefined
  const value = isControlled ? (valueProp as string) : internalValue
  const setValue = (v: string) => {
    if (!isControlled) setInternalValue(v)
    onValueChange?.(v)
    setOpen(false)
  }
  const registerOption = React.useCallback((o: Option) => {
    setOptions((prev) => (prev.find((p) => p.value === o.value) ? prev : [...prev, o]))
  }, [])
  const ctx: SelectContextValue = { value, setValue, open, setOpen, options, registerOption }
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const selected = options.find((o) => o.value === value)
  return (
    <SelectContext.Provider value={ctx}>
      <div ref={ref} className={cn('relative', className)}>
        {React.Children.map(children, (c) => {
          if (!React.isValidElement(c)) return c
          const type = (c as any).type
          if (type === SelectTrigger) return c
          if (type === SelectContent) return open ? c : null
          return c
        })}
      </div>
    </SelectContext.Provider>
  )
}

function useSelect() {
  const ctx = React.useContext(SelectContext)
  if (!ctx) throw new Error('Select components must be used inside <Select>')
  return ctx
}

export function SelectTrigger({ className, children, id, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, value, options } = useSelect()
  const selected = options.find((o) => o.value === value)
  return (
    <button
      id={id}
      type="button"
      data-slot="select-trigger"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children ?? selected?.label ?? <span className="text-muted-foreground">Seleccionar...</span>}
      <ChevronDown className="size-4 opacity-60" />
    </button>
  )
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, options } = useSelect()
  const selected = options.find((o) => o.value === value)
  if (!selected) return <span className="text-muted-foreground">{placeholder ?? 'Seleccionar...'}</span>
  return <>{selected.label}</>
}

export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { registerOption } = useSelect()
  // Pre-register all options from children
  React.useEffect(() => {
    React.Children.forEach(children, (c) => {
      if (React.isValidElement(c) && (c as any).props?.value) {
        const p = (c as any).props
        registerOption({ value: p.value, label: p.label ?? p.children ?? p.value })
      }
    })
  }, [children, registerOption])
  return (
    <div
      data-slot="select-content"
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in',
        className
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

export function SelectItem({
  value,
  label,
  children,
  className,
}: {
  value: string
  label?: string
  children?: React.ReactNode
  className?: string
}) {
  const { value: current, setValue, registerOption } = useSelect()
  React.useEffect(() => {
    registerOption({ value, label: label ?? (typeof children === 'string' ? children : value) })
  }, [value, label, children, registerOption])
  const isSelected = current === value
  return (
    <div
      role="option"
      aria-selected={isSelected}
      data-slot="select-item"
      onClick={() => setValue(value)}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent/60',
        className
      )}
    >
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        {isSelected && <Check className="size-4" />}
      </span>
      {children ?? label ?? value}
    </div>
  )
}
