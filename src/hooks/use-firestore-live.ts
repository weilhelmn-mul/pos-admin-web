'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { collection, onSnapshot, getDocs, type Firestore } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface UseFirestoreLiveOptions {
  /** Intervalo de polling de respaldo (ms). Default: 60000 (60s). onSnapshot es en tiempo real, este es backup. */
  pollIntervalMs?: number
  /** Si true, no suscribe onSnapshot (solo polling). Default: false (usa onSnapshot). */
  pollOnly?: boolean
}

interface UseFirestoreLiveResult<T> {
  data: T[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  /** Refresca manualmente (lo usa el botón "Actualizar") */
  refresh: () => Promise<void>
  /** Indica si hay una suscripción onSnapshot activa (tiempo real) */
  live: boolean
}

/**
 * Hook para escuchar una colección de Firestore en tiempo real.
 *
 * - onSnapshot: dispara automáticamente cuando cualquier doc cambia (DELETE/INSERT/UPDATE)
 * - Polling de respaldo cada pollIntervalMs (default 60s) para reconectar si onSnapshot falla
 * - `refresh()` permite forzar una recarga manual (botón "Actualizar")
 *
 * El usuario debe estar autenticado (Firebase Auth) para que Firestore Rules permitan lectura.
 */
export function useFirestoreLive<T = Record<string, any>>(
  collectionName: string | null,
  options: UseFirestoreLiveOptions = {}
): UseFirestoreLiveResult<T> {
  const { pollIntervalMs = 60000, pollOnly = false } = options
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [live, setLive] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)

  const loadOnce = useCallback(async () => {
    if (!db) {
      setError('Firebase no configurado')
      setLoading(false)
      return
    }
    if (!collectionName) {
      setData([])
      setLoading(false)
      return
    }
    try {
      const snap = await getDocs(collection(db as Firestore, collectionName))
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as T[]
      setData(items)
      setLastUpdated(new Date())
      setError(null)
    } catch (e: any) {
      setError(e?.message || 'Error al cargar')
    } finally {
      setLoading(false)
    }
  }, [collectionName])

  // onSnapshot: actualización en tiempo real
  useEffect(() => {
    if (!db || !collectionName || pollOnly) {
      setLive(false)
      return
    }
    try {
      const unsub = onSnapshot(
        collection(db as Firestore, collectionName),
        (snap) => {
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as T[]
          setData(items)
          setLastUpdated(new Date())
          setError(null)
          setLoading(false)
          setLive(true)
        },
        (err) => {
          console.error(`[useFirestoreLive:${collectionName}] onSnapshot error:`, err)
          setError(err?.message || 'Error en suscripción tiempo real')
          setLive(false)
          // Fallback: intentar getDocs una vez
          loadOnce()
        }
      )
      unsubRef.current = unsub
      return () => {
        unsub()
        unsubRef.current = null
        setLive(false)
      }
    } catch (e: any) {
      console.error(`[useFirestoreLive:${collectionName}] init error:`, e)
      setError(e?.message || 'Error inicializando tiempo real')
      setLive(false)
      loadOnce()
    }
  }, [collectionName, pollOnly, loadOnce])

  // Polling de respaldo (por si onSnapshot se desconecta silenciosamente)
  useEffect(() => {
    if (!collectionName) return
    const interval = setInterval(async () => {
      // Solo poll si onSnapshot no está activo o como doble verificación
      if (!unsubRef.current || !live) {
        await loadOnce()
      }
    }, pollIntervalMs)
    return () => clearInterval(interval)
  }, [collectionName, pollIntervalMs, live, loadOnce])

  const refresh = useCallback(async () => {
    await loadOnce()
  }, [loadOnce])

  return { data, loading, error, lastUpdated, refresh, live }
}

/** Helper: tiempo relativo en español (e.g., "hace 5s", "hace 2 min") */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return '—'
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 5) return 'ahora mismo'
  if (diff < 60) return `hace ${diff}s`
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}
