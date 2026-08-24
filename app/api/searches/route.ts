import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { listTables } from '@/lib/coda'

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db.from('searches').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ searches: data })
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin()
  const body = await req.json()

  // Verify the Coda doc/table is accessible
  try {
    await listTables(body.coda_doc_id)
  } catch {
    return NextResponse.json({ error: 'Could not access that Coda document. Check the doc ID.' }, { status: 400 })
  }

  const { data, error } = await db.from('searches').insert({
    name: body.name,
    coda_doc_id: body.coda_doc_id,
    coda_table_id: body.coda_table_id,
    status: 'active',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ search: data })
}
