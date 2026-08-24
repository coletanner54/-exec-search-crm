import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const search_id = searchParams.get('search_id')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = 50
  const offset = (page - 1) * limit

  const db = supabaseAdmin()
  let query = db.from('contacts').select('*', { count: 'exact' })

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%,title.ilike.%${q}%`)
  }

  if (search_id) {
    query = query.contains('search_ids', [search_id])
  }

  query = query.order('full_name').range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts: data, total: count, page, limit })
}

export async function POST(req: NextRequest) {
  const db = supabaseAdmin()
  const body = await req.json()

  const { data, error } = await db.from('contacts').insert({
    full_name: body.full_name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    title: body.title ?? null,
    linkedin_url: body.linkedin_url ?? null,
    location: body.location ?? null,
    sources: ['manual'],
    search_ids: body.search_ids ?? [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact: data })
}
