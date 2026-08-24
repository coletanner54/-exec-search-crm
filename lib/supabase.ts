import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local.')
  return url
}

export function supabaseClient() {
  return createClient(getSupabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export function supabaseAdmin() {
  return createClient(getSupabaseUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export type Contact = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
  linkedin_url: string | null
  location: string | null
  sources: string[]
  search_ids: string[]
  created_at: string
  updated_at: string
}

export type ContactNote = {
  id: string
  contact_id: string
  content: string
  source: 'coda' | 'onenote' | 'manual'
  source_url: string | null
  author: string | null
  note_date: string | null
  created_at: string
}

export type Search = {
  id: string
  name: string
  coda_doc_id: string
  coda_table_id: string
  status: 'active' | 'closed' | 'on_hold'
  created_at: string
  updated_at: string
}

export type Duplicate = {
  id: string
  contact_id_1: string
  contact_id_2: string
  similarity_score: number
  match_fields: string[]
  status: 'pending' | 'merged' | 'dismissed'
  created_at: string
  contact_1?: Contact
  contact_2?: Contact
}

export type SyncLog = {
  id: string
  source: string
  search_id: string | null
  status: 'success' | 'error' | 'partial'
  contacts_added: number
  contacts_updated: number
  notes_added: number
  duplicates_flagged: number
  error_message: string | null
  started_at: string
  finished_at: string | null
}
