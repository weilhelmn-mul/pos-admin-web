'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export interface AppUser {
  uid: string; email: string; displayName: string; role: 'admin' | 'supervisor' | 'user'; permissions: string[]; active: boolean
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!auth) { setError('Firebase no configurado'); setLoading(false); return }
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        let appUser: AppUser = { uid: fbUser.uid, email: fbUser.email || '', displayName: fbUser.displayName || '', role: 'admin', permissions: ['all'], active: true }
        try {
          const userDoc = await getDoc(doc(db!, 'users', fbUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            appUser = { ...appUser, role: data.role || 'admin', permissions: data.permissions || ['all'], active: data.active !== false }
          }
        } catch (e) { console.log('[auth] Firestore no disponible, rol admin por defecto') }
        setUser(appUser)
      } else { setUser(null) }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email: string, password: string) => {
    setError(null)
    try { await signInWithEmailAndPassword(auth, email, password) }
    catch (e: any) {
      const code = e.code || ''
      let msg = 'Error al iniciar sesión'
      if (code === 'auth/user-not-found') msg = 'Usuario no encontrado'
      else if (code === 'auth/wrong-password') msg = 'Contraseña incorrecta'
      else if (code === 'auth/invalid-email') msg = 'Email inválido'
      else if (code === 'auth/configuration-not-found') msg = 'Firebase Auth no configurado. Habilita Email/Password en Firebase Console.'
      else msg = e.message || msg
      setError(msg); throw new Error(msg)
    }
  }
  const logout = async () => { await signOut(auth); setUser(null) }
  const resetPassword = async (email: string) => { await sendPasswordResetEmail(auth, email) }
  const hasPermission = (perm: string): boolean => { if (!user) return false; if (user.role === 'admin') return true; return user.permissions.includes(perm) }
  return { user, loading, error, login, logout, resetPassword, hasPermission }
}
