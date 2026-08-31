import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { listTables, getAllRows, extractContactFromRow } from '@/lib/coda'

const CT_NOTES_DOC_ID = 'e14ajCn21C'
const CODA_CONCURRENCY = 5
const DB_CHUNK = 50

export async function POST() {
  const db = supabaseAdmin()

  const logStart = await db.from('sync_logs').insert({
    source: 'coda',
    status: 'partial',
    started_at: new Date().toISOString(),
  }).select().single()
  const logId = logStart.data?.id

  try {
    // 1. Get all Candidate Mapping tables
    const allTables = await listTables(CT_NOTES_DOC_ID)
    const candidateTables = allTables.filter(t => t.name.includes('Candidate Mapping'))

    // 2. Fetch rows from all tables in parallel (5 at a time)
    const allRows = []
    for (let i = 0; i < candidateTables.length; i += CODA_CONCURRENCY) {
      const batch = candidateTables.slice(i, i + CODA_CONCURRENCY)
      const results = await Promise.all(
        batch.map(t => getAllRows(CT_NOTES_DOC_ID, t.id, true).catch(() => []))
      )
      allRows.push(...results.flat())
    }

    // 3. Load all existing contacts and their coda row IDs in one query
    const { data: existingContacts } = await db
      .from('contacts')
      .select('id, full_name, email, coda_row_ids')

    const rowIdToContactId = new Map<string, string>()
    for (const c of (existingContacts ?? [])) {
      for (const rid of (c.coda_row_ids ?? [])) {
        rowIdToContactId.set(rid, c.id)
      }
    }

    // 4. Load all existing note source IDs in one query
    const { data: existingNotes } = await db
      .from('contact_notes')
      .select('source_id')
      .eq('source', 'coda')
      .not('source_id', 'is', null)
    const existingNoteSourceIds = new Set((existingNotes ?? []).map(n => n.source_id))

    // 5. Process rows — separate new contacts from existing
    const toInsert: object[] = []
    const fieldsByRowId = new Map<string, ReturnType<typeof extractContactFromRow>>()

    for (const row of allRows) {
      const fields = extractContactFromRow(row)
      if (!fields.full_name) continue
      fieldsByRowId.set(row.id, fields)

      if (!rowIdToContactId.has(row.id)) {
        toInsert.push({
          full_name: fields.full_name,
          email: fields.email ?? null,
          phone: fields.phone ?? null,
          company: fields.company ?? null,
          title: fields.title ?? null,
          linkedin_url: fields.linkedin_url ?? null,
          location: fields.location ?? null,
          sources: ['ct-notes'],
          coda_row_ids: [row.id],
          search_ids: [],
        })
      }
    }

    // 6. Bulk insert new contacts in chunks, collect returned IDs
    let contactsAdded = 0
    const newRowIdToContactId = new Map<string, string>()

    for (let i = 0; i < toInsert.length; i += DB_CHUNK) {
      const chunk = toInsert.slice(i, i + DB_CHUNK)
      const { data: inserted } = await db.from('contacts').insert(chunk).select('id, coda_row_ids')
      if (inserted) {
        for (const c of inserted) {
          for (const rid of (c.coda_row_ids ?? [])) {
            newRowIdToContactId.set(rid, c.id)
          }
        }
        contactsAdded += inserted.length
      }
    }

    const contactsUpdated = (existingContacts?.length ?? 0) - (allRows.length - toInsert.length - allRows.filter(r => !fieldsByRowId.has(r.id)).length)

    // 7. Bulk insert missing notes
    const notesToInsert: object[] = []
    for (const [rowId, fields] of fieldsByRowId) {
      if (!fields.notes) continue
      if (existingNoteSourceIds.has(rowId)) continue
      const contactId = rowIdToContactId.get(rowId) ?? newRowIdToContactId.get(rowId)
      if (!contactId) continue
      notesToInsert.push({
        contact_id: contactId,
        content: fields.notes,
        source: 'coda',
        source_id: rowId,
      })
    }

    let notesAdded = 0
    for (let i = 0; i < notesToInsert.length; i += DB_CHUNK) {
      const { data } = await db.from('contact_notes').insert(notesToInsert.slice(i, i + DB_CHUNK)).select('id')
      notesAdded += data?.length ?? 0
    }

    await db.from('sync_logs').update({
      status: 'success',
      contacts_added: contactsAdded,
      contacts_updated: 0,
      notes_added: notesAdded,
      duplicates_flagged: 0,
      finished_at: new Date().toISOString(),
    }).eq('id', logId)

    return NextResponse.json({ success: true, contactsAdded, contactsUpdated: 0, notesAdded })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await db.from('sync_logs').update({ status: 'error', error_message: message, finished_at: new Date().toISOString() }).eq('id', logId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
