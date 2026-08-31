import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { listTables, getAllRows, extractContactFromRow, listRows } from '@/lib/coda'

// GET: diagnostic — returns first table name + first 2 rows of raw data
export async function GET() {
  try {
    const allTables = await listTables(CT_NOTES_DOC_ID)
    const candidateTables = allTables.filter(t => t.name.includes('Candidate Mapping'))
    if (candidateTables.length === 0) {
      return NextResponse.json({ error: 'No Candidate Mapping tables found', allTableNames: allTables.map(t => t.name) })
    }
    const firstTable = candidateTables[0]
    const { rows } = await listRows(CT_NOTES_DOC_ID, firstTable.id, undefined, true)
    return NextResponse.json({
      totalCandidateTables: candidateTables.length,
      firstTableName: firstTable.name,
      firstTableId: firstTable.id,
      rowCount: rows.length,
      sampleRow: rows[0] ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}

const CT_NOTES_DOC_ID = 'e14ajCn21C'
const TABLES_PER_BATCH = 3
const DB_CHUNK = 50

export async function POST(req: NextRequest) {
  const db = supabaseAdmin()
  const body = await req.json().catch(() => ({}))
  const startIndex: number = body.startIndex ?? 0

  try {
    // Get all Candidate Mapping tables
    const allTables = await listTables(CT_NOTES_DOC_ID)
    const candidateTables = allTables.filter(t => t.name.includes('Candidate Mapping'))
    const batch = candidateTables.slice(startIndex, startIndex + TABLES_PER_BATCH)
    const nextIndex = startIndex + TABLES_PER_BATCH
    const hasMore = nextIndex < candidateTables.length

    if (batch.length === 0) {
      return NextResponse.json({ success: true, contactsAdded: 0, notesAdded: 0, hasMore: false, nextIndex })
    }

    // Fetch rows from this batch of tables in parallel
    const results = await Promise.all(
      batch.map(t => getAllRows(CT_NOTES_DOC_ID, t.id, true).catch(() => []))
    )
    const allRows = results.flat()

    // Load existing contacts' coda row IDs
    const { data: existingContacts } = await db
      .from('contacts')
      .select('id, coda_row_ids')

    const rowIdToContactId = new Map<string, string>()
    for (const c of (existingContacts ?? [])) {
      for (const rid of (c.coda_row_ids ?? [])) {
        rowIdToContactId.set(rid, c.id)
      }
    }

    // Load existing note source IDs
    const { data: existingNotes } = await db
      .from('contact_notes')
      .select('source_id')
      .eq('source', 'coda')
      .not('source_id', 'is', null)
    const existingNoteSourceIds = new Set((existingNotes ?? []).map(n => n.source_id))

    // Build list of new contacts to insert
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

    // Bulk insert new contacts
    let contactsAdded = 0
    const newRowIdToContactId = new Map<string, string>()

    for (let i = 0; i < toInsert.length; i += DB_CHUNK) {
      const { data: inserted } = await db
        .from('contacts')
        .insert(toInsert.slice(i, i + DB_CHUNK))
        .select('id, coda_row_ids')
      if (inserted) {
        for (const c of inserted) {
          for (const rid of (c.coda_row_ids ?? [])) {
            newRowIdToContactId.set(rid, c.id)
          }
        }
        contactsAdded += inserted.length
      }
    }

    // Bulk insert missing notes
    const notesToInsert: object[] = []
    for (const [rowId, fields] of fieldsByRowId) {
      if (!fields.notes) continue
      if (existingNoteSourceIds.has(rowId)) continue
      const contactId = rowIdToContactId.get(rowId) ?? newRowIdToContactId.get(rowId)
      if (!contactId) continue
      notesToInsert.push({ contact_id: contactId, content: fields.notes, source: 'coda', source_id: rowId })
    }

    let notesAdded = 0
    for (let i = 0; i < notesToInsert.length; i += DB_CHUNK) {
      const { data } = await db
        .from('contact_notes')
        .insert(notesToInsert.slice(i, i + DB_CHUNK))
        .select('id')
      notesAdded += data?.length ?? 0
    }

    return NextResponse.json({
      success: true,
      contactsAdded,
      notesAdded,
      hasMore,
      nextIndex,
      totalTables: candidateTables.length,
      tablesProcessed: startIndex + batch.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
