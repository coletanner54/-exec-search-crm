import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('duplicates')
    .select(`
      *,
      contact_1:contacts!duplicates_contact_id_1_fkey(*),
      contact_2:contacts!duplicates_contact_id_2_fkey(*)
    `)
    .eq('status', 'pending')
    .order('similarity_score', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ duplicates: data })
}

export async function PATCH(req: NextRequest) {
  const db = supabaseAdmin()
  const { id, action, keep_id } = await req.json()

  if (action === 'merge' && keep_id) {
    // Get both contacts
    const { data: dup } = await db.from('duplicates').select('*').eq('id', id).single()
    if (!dup) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const discard_id = dup.contact_id_1 === keep_id ? dup.contact_id_2 : dup.contact_id_1

    // Move notes to kept contact
    await db.from('contact_notes').update({ contact_id: keep_id }).eq('contact_id', discard_id)

    // Delete the discarded contact
    await db.from('contacts').delete().eq('id', discard_id)

    // Mark duplicate as merged
    await db.from('duplicates').update({ status: 'merged' }).eq('id', id)

    return NextResponse.json({ success: true })
  }

  if (action === 'dismiss') {
    await db.from('duplicates').update({ status: 'dismissed' }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
