import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isFirebaseAdminConfigured } from '@/lib/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/customers?limit=500
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
    const q = db.collection('customers').limit(limit)
    const snap = await q.get()
    const items = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as any) }))
    return NextResponse.json({ data: items, count: items.length })
  } catch (e: any) {
    console.error('[api/customers] GET error', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}

// POST /api/customers  (anti-duplicate by DNI/RUC → 409)
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
    const docNumber = body.document || body.dni || body.ruc

    if (!externalId) {
      return NextResponse.json(
        { error: 'externalId es obligatorio' },
        { status: 400 }
      )
    }

    const colRef = db.collection('customers')

    // Anti-duplicate: if docNumber is provided, check for existing customer with same doc
    if (docNumber) {
      const dupSnap = await colRef.where('document', '==', docNumber).limit(1).get()
      if (!dupSnap.empty) {
        const existing = dupSnap.docs[0]
        const data = existing.data() as any
        if (data.externalId !== externalId) {
          return NextResponse.json(
            {
              error: 'Ya existe un cliente con ese documento',
              existingId: existing.id,
            },
            { status: 409 }
          )
        }
      }
    }

    const now = new Date().toISOString()
    const payload = {
      ...body,
      externalId,
      source: body.source || 'pos-desktop',
      syncStatus: 'synced',
      syncedAt: now,
      updatedAt: now,
    }

    const docRef = colRef.doc(externalId)
    const snap = await docRef.get()
    if (snap.exists) {
      await docRef.set(payload, { merge: true })
      return NextResponse.json(
        { data: { id: externalId, ...payload }, created: false },
        { status: 200 }
      )
    }
    await docRef.set(payload)
    return NextResponse.json(
      { data: { id: externalId, ...payload }, created: true },
      { status: 201 }
    )
  } catch (e: any) {
    console.error('[api/customers] POST error', e)
    return NextResponse.json({ error: e?.message || 'Error interno' }, { status: 500 })
  }
}
