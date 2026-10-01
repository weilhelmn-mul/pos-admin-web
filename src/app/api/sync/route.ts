import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLLECTIONS = ['sales', 'products', 'customers'] as const

// GET /api/sync — status with counts
export async function GET() {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'FIREBASE_SERVICE_ACCOUNT no configurada en el servidor' },
      { status: 500 }
    )
  }
  try {
    const db = getAdminDb()
    const counts: Record<string, number> = {}
    const lastSyncedAt: Record<string, string | null> = {}

    for (const c of COLLECTIONS) {
      const snap = await db.collection(c).get()
      counts[c] = snap.size
      // Get the most recent syncedAt among all docs (cheap if collection small)
      let latest: any = null
      snap.forEach((d: any) => {
        const ts = (d.data() as any)?.syncedAt
        if (ts) {
          if (!latest || new Date(ts) > new Date(latest)) latest = ts
        }
      })
      lastSyncedAt[c] = latest
    }

    return NextResponse.json({
      status: 'ok',
      project: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'unknown',
      collections: counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      lastSyncedAt,
    })
  } catch (e: any) {
    console.error('[api/sync] GET error', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}

// POST /api/sync  — batch sync sales+products+customers
// Body: { sales: [...], products: [...], customers: [...] }  (each item must have externalId or id)
export async function POST(req: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'FIREBASE_SERVICE_ACCOUNT no configurada en el servidor' },
      { status: 500 }
    )
  }
  try {
    const db = getAdminDb()
    const body = await req.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 })
    }

    const result = {
      sales: { upserted: 0, errors: [] as string[] },
      products: { upserted: 0, errors: [] as string[] },
      customers: { upserted: 0, errors: [] as string[] },
    }
    const BATCH_MAX = 400
    const now = new Date().toISOString()

    const upsertBatch = async (collectionName: string, items: any[], bucket: { upserted: number; errors: string[] }) => {
      if (!Array.isArray(items)) return
      for (let i = 0; i < items.length; i += BATCH_MAX) {
        const slice = items.slice(i, i + BATCH_MAX)
        const batch = db.batch()
        let count = 0
        for (const item of slice) {
          const externalId = item.externalId || item.id
          if (!externalId || typeof externalId !== 'string') {
            bucket.errors.push(`item sin externalId en ${collectionName}`)
            continue
          }
          const ref = db.collection(collectionName).doc(externalId)
          const payload = {
            ...item,
            externalId,
            source: item.source || 'pos-desktop',
            syncStatus: 'synced',
            syncedAt: now,
            updatedAt: now,
          }
          batch.set(ref, payload, { merge: true })
          count++
        }
        if (count > 0) {
          await batch.commit()
          bucket.upserted += count
        }
      }
    }

    await upsertBatch('sales', body.sales, result.sales)
    await upsertBatch('products', body.products, result.products)
    await upsertBatch('customers', body.customers, result.customers)

    const total =
      result.sales.upserted + result.products.upserted + result.customers.upserted

    return NextResponse.json({
      status: 'ok',
      syncedAt: now,
      total,
      details: result,
    })
  } catch (e: any) {
    console.error('[api/sync] POST error', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
