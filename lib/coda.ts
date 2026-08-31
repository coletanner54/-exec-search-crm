const CODA_API_BASE = 'https://coda.io/apis/v1'
const token = process.env.CODA_API_TOKEN

function headers() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export type CodaDoc = {
  id: string
  name: string
  browserLink: string
}

export type CodaTable = {
  id: string
  name: string
}

export type CodaRow = {
  id: string
  values: Record<string, unknown>
}

export async function listDocs(): Promise<CodaDoc[]> {
  const res = await fetch(`${CODA_API_BASE}/docs?limit=50`, { headers: headers() })
  if (!res.ok) throw new Error(`Coda API error: ${res.statusText}`)
  const data = await res.json()
  return data.items ?? []
}

export async function listTables(docId: string): Promise<CodaTable[]> {
  const tables: CodaTable[] = []
  let pageToken: string | undefined

  do {
    const url = new URL(`${CODA_API_BASE}/docs/${docId}/tables`)
    url.searchParams.set('limit', '200')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url.toString(), { headers: headers() })
    if (!res.ok) throw new Error(`Coda API error: ${res.statusText}`)
    const data = await res.json()
    tables.push(...(data.items ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return tables
}

export async function listRows(docId: string, tableId: string, pageToken?: string, useColumnNames = false): Promise<{ rows: CodaRow[]; nextPageToken?: string }> {
  const url = new URL(`${CODA_API_BASE}/docs/${docId}/tables/${tableId}/rows`)
  url.searchParams.set('limit', '500')
  url.searchParams.set('valueFormat', 'simple')
  if (useColumnNames) url.searchParams.set('useColumnNames', 'true')
  if (pageToken) url.searchParams.set('pageToken', pageToken)

  const res = await fetch(url.toString(), { headers: headers() })
  if (!res.ok) throw new Error(`Coda API error: ${res.statusText}`)
  const data = await res.json()
  return { rows: data.items ?? [], nextPageToken: data.nextPageToken }
}

export async function getAllRows(docId: string, tableId: string, useColumnNames = false): Promise<CodaRow[]> {
  const rows: CodaRow[] = []
  let pageToken: string | undefined

  do {
    const result = await listRows(docId, tableId, pageToken, useColumnNames)
    rows.push(...result.rows)
    pageToken = result.nextPageToken
  } while (pageToken)

  return rows
}

// Extracts contact fields from a Coda row using common column name patterns.
// Works with both column IDs (default valueFormat) and column names (useColumnNames=true).
export function extractContactFromRow(row: CodaRow): Partial<{
  full_name: string
  email: string
  phone: string
  company: string
  title: string
  linkedin_url: string
  location: string
  notes: string
}> {
  const v = row.values
  const find = (...keys: string[]) => {
    for (const key of keys) {
      const match = Object.entries(v).find(([k]) => k.toLowerCase().includes(key.toLowerCase()))
      if (match && match[1]) return String(match[1])
    }
    return undefined
  }

  return {
    full_name: find('full name', 'name', 'candidate', 'contact'),
    email: find('email', 'e-mail'),
    phone: find('cell', 'phone', 'mobile'),
    company: find('company', 'organization', 'employer', 'firm', 'current company'),
    title: find('current role', 'role', 'title', 'position', 'job'),
    linkedin_url: find('linkedin', 'profile'),
    location: find('location', 'city', 'state', 'region'),
    notes: find('notes', 'comments', 'background', 'summary'),
  }
}
