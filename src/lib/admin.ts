import * as admin from 'firebase-admin'

let app: admin.app.App | null = null

/**
 * Returns a Firebase Admin Firestore instance configured from
 * the FIREBASE_SERVICE_ACCOUNT environment variable (JSON string).
 * Caches the app so initialization happens only once per process.
 */
export function getAdminApp(): admin.app.App {
  if (app) return app
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!sa) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no configurada en variables de entorno')
  }
  let serviceAccount: admin.ServiceAccount
  try {
    serviceAccount = JSON.parse(sa)
  } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido')
  }
  if (admin.apps.length > 0) {
    app = admin.apps[0] as admin.app.App
    return app
  }
  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
  })
  return app
}

export function getAdminDb(): admin.firestore.Firestore {
  return admin.firestore(getAdminApp())
}

export function getAdminAuth(): admin.auth.Auth {
  return admin.auth(getAdminApp())
}

export function isFirebaseAdminConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT
}
