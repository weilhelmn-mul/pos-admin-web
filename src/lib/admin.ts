import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let app: App | null = null
let db: Firestore | null = null

/**
 * Inicializa Firebase Admin SDK desde la variable de entorno FIREBASE_SERVICE_ACCOUNT.
 * Cachea la instancia para reutilizarla entre invocaciones (Vercel serverless).
 */
export function getAdminApp(): App {
  if (app) return app

  // Reutilizar app existente si ya está inicializada
  if (getApps().length > 0) {
    app = getApps()[0]!
    return app
  }

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!sa) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no configurada en variables de entorno')
  }

  let serviceAccount: {
    projectId: string
    privateKey: string
    clientEmail: string
  }

  try {
    const parsed = JSON.parse(sa)
    // Normalizar: las keys del JSON de service account vienen en camelCase
    serviceAccount = {
      projectId: parsed.project_id || parsed.projectId,
      privateKey: parsed.private_key || parsed.privateKey,
      clientEmail: parsed.client_email || parsed.clientEmail,
    }
    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      throw new Error('Service account incompleta: faltan projectId/privateKey/clientEmail')
    }
  } catch (e: any) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT inválida: ${e.message}`)
  }

  app = initializeApp({
    credential: cert({
      projectId: serviceAccount.projectId,
      privateKey: serviceAccount.privateKey.replace(/\\n/g, '\n'),
      clientEmail: serviceAccount.clientEmail,
    }),
    projectId: serviceAccount.projectId,
  })

  return app
}

export function getAdminDb(): Firestore {
  if (db) return db
  const app = getAdminApp()
  db = getFirestore(app)
  return db
}

export function isFirebaseAdminConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT
}
