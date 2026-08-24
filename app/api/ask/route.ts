import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { askQuestion } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const { question, search_id } = await req.json()

  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Full-text search contacts
  const contactQuery = db
    .from('contacts')
    .select('*')
    .textSearch('full_name', question.split(' ').filter(Boolean).join(' | '), { type: 'websearch' })
    .limit(20)

  if (search_id) contactQuery.contains('search_ids', [search_id])

  // Also do a broad match on company/title
  const broadQuery = db
    .from('contacts')
    .select('*')
    .or(`company.ilike.%${question}%,title.ilike.%${question}%`)
    .limit(10)

  // Search notes
  const notesQuery = db
    .from('contact_notes')
    .select('*')
    .textSearch('content', question.split(' ').filter(Boolean).join(' | '), { type: 'websearch' })
    .limit(20)

  const [contactResult, broadResult, notesResult] = await Promise.all([
    contactQuery,
    broadQuery,
    notesQuery,
  ])

  // Deduplicate contacts
  const contactMap = new Map<string, unknown>()
  for (const c of [...(contactResult.data ?? []), ...(broadResult.data ?? [])]) {
    const contact = c as { id: string }
    if (!contactMap.has(contact.id)) contactMap.set(contact.id, c)
  }

  const answer = await askQuestion(question, {
    contacts: [...contactMap.values()],
    notes: notesResult.data ?? [],
  })

  return NextResponse.json({
    answer,
    contacts: [...contactMap.values()],
    notes: notesResult.data ?? [],
  })
}
