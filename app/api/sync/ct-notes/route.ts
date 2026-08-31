import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { listTables, getAllRows, extractContactFromRow } from '@/lib/coda'
import { detectDuplicates } from '@/lib/utils'

const CT_NOTES_DOC_ID = 'e14ajCn21C'

export async function POST() {
  const db = supabaseAdmin()

  const logStart = await db.from('sync_logs').insert({
    source: 'coda',
    status: 'partial',
    started_at: new Date().toISOString(),
  }).select().single()

  const logId = logStart.data?.id
  let contactsAdded = 0
  let contactsUpdated = 0
  let notesAdded = 0
  let duplicatesFlagged = 0

  try {
    const allTables = await listTables(CT_NOTES_DOC_ID)
    const candidateTables = allTables.filter(t => t.name.includes('Candidate Mapping'))

    const { data: existingContacts } = await db.from('contacts').select('id, full_name, email')
    const existing = existingContacts ?? []

    for (const table of candidateTables) {
      let rows
      try {
        rows = await getAllRows(CT_NOTES_DOC_ID, table.id, true)
      } catch {
        continue
      }

      for (const row of rows) {
        const fields = extractContactFromRow(row)
        if (!fields.full_name) continue

        const notes = fields.notes
        const contactData = {
          full_name: fields.full_name,
          email: fields.email ?? null,
          phone: fields.phone ?? null,
          company: fields.company ?? null,
          title: fields.title ?? null,
          linkedin_url: fields.linkedin_url ?? null,
          location: fields.location ?? null,
        }

        const { data: existingByRow } = await db
          .from('contacts')
          .select('id, coda_row_ids')
          .contains('coda_row_ids', [row.id])
          .single()

        let contactId: string

        if (existingByRow) {
          await db.from('contacts').update({
            ...contactData,
            updated_at: new Date().toISOString(),
          }).eq('id', existingByRow.id)
          contactId = existingByRow.id
          contactsUpdated++
        } else {
          const dupes = detectDuplicates(contactData, existing)

          const { data: newContact } = await db.from('contacts').insert({
            ...contactData,
            sources: ['ct-notes'],
            coda_row_ids: [row.id],
            search_ids: [],
          }).select().single()

          if (!newContact) continue
          contactId = newContact.id
          contactsAdded++
          existing.push({ id: contactId, full_name: contactData.full_name, email: contactData.email })

          for (const dupe of dupes) {
            await db.from('duplicates').upsert({
              contact_id_1: dupe.id < contactId ? dupe.id : contactId,
              contact_id_2: dupe.id < contactId ? contactId : dupe.id,
              similarity_score: dupe.similarity_score,
              match_fields: dupe.match_fields,
              status: 'pending',
            }, { onConflict: 'contact_id_1,contact_id_2', ignoreDuplicates: true })
            duplicatesFlagged++
          }
        }

        if (notes) {
          const { data: existingNote } = await db
            .from('contact_notes')
            .select('id')
            .eq('contact_id', contactId)
            .eq('source_id', row.id)
            .single()

          if (!existingNote) {
            await db.from('contact_notes').insert({
              contact_id: contactId,
              content: notes,
              source: 'coda',
              source_id: row.id,
            })
            notesAdded++
          }
        }
      }
    }

    await db.from('sync_logs').update({
      status: 'success',
      contacts_added: contactsAdded,
      contacts_updated: contactsUpdated,
      notes_added: notesAdded,
      duplicates_flagged: duplicatesFlagged,
      finished_at: new Date().toISOString(),
    }).eq('id', logId)

    return NextResponse.json({ success: true, contactsAdded, contactsUpdated, notesAdded, duplicatesFlagged })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await db.from('sync_logs').update({ status: 'error', error_message: message, finished_at: new Date().toISOString() }).eq('id', logId)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
