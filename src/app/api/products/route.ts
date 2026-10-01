import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/products?category=Bebidas&limit=500
export async function GET(req: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'FIREBASE_SERVICE_ACCOUNT no configurada en el servidor' },
      { status: 500 }
    )
  }
  try {
    const db = getAdminDb()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') || 500), 1000)
    const category = searchParams.get('category')

    let q: any = db.collection('products')
    if (category) q = q.where('category', '==', category)
    q = q.limit(limit)

    const snap = await q.get()
    const items = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }))
    return NextResponse.json({ data: items, count: items.length })
  } catch (e: any) {
    console.error('[api/products] GET error', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}

// POST /api/products  (upsert by externalId or id)
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
    const externalId = body.externalId || body.id
    if (!externalId) {
      return NextResponse.json(
        { error: 'externalId es obligatorio' },
        { status: 400 }
      )
    }

    const colRef = db.collection('products')
    const now = new Date().toISOString()
    const payload = {
      ...body,
      externalId,
      source: body.source || 'pos-desktop',
      syncStatus: 'synced',
      syncedAt: now,
      updatedAt: now,
    }

    // Try by docId == externalId first (upsert semantics)
    const docRef = colRef.doc(externalId)
    const snap = await docRef.get()
    if (snap.exists) {
      await docRef.set(payload, { merge: true })
      return NextResponse.json(
        { data: { id: externalId, ...payload }, created: false },
        { status: 200 }
      )
    }

    // Otherwise also check externalId field as fallback
    const existing = await colRef.where('externalId', '==', externalId).limit(1).get()
    if (!existing.empty) {
      const ref = existing.docs[0].ref
      await ref.set(payload, { merge: true })
      return NextResponse.json(
        { data: { id: ref.id, ...payload }, created: false },
        { status: 200 }
      )
    }

    await docRef.set(payload)
    return NextResponse.json(
      { data: { id: externalId, ...payload }, created: true },
      { status: 201 }
    )
  } catch (e: any) {
    console.error('[api/products] POST error', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
