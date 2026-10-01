'use client'
import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useState } from 'react'

export function ThemeProvider({ children, attribute = 'class', defaultTheme = 'light', enableSystem = true, disableTransitionOnChange = false }: {
  children: React.ReactNode; attribute?: string; defaultTheme?: string; enableSystem?: boolean; disableTransitionOnChange?: boolean
}) {
  const [mounted, setMounted] = useState(false)
  const { setTheme } = useTheme()
  useEffect(() => { setMounted(true); setTheme(defaultTheme) }, [defaultTheme, setTheme])
  if (!mounted) return <>{children}</>
  return <>{children}</>
}
