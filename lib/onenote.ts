const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export type OneNoteNotebook = {
  id: string
  displayName: string
}

export type OneNoteSection = {
  id: string
  displayName: string
}

export type OneNotePage = {
  id: string
  title: string
  createdDateTime: string
  lastModifiedDateTime: string
  contentUrl: string
}

export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(`https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      scope: 'Notes.Read offline_access',
    }),
  })
  const data = await res.json()
  return data.access_token
}

export function getMsAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.MICROSOFT_REDIRECT_URI!,
    scope: 'Notes.Read offline_access',
    response_mode: 'query',
  })
  return `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}/oauth2/v2.0/authorize?${params}`
}

export async function listNotebooks(accessToken: string): Promise<OneNoteNotebook[]> {
  const res = await fetch(`${GRAPH_BASE}/me/onenote/notebooks`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.value ?? []
}

export async function listSections(accessToken: string, notebookId: string): Promise<OneNoteSection[]> {
  const res = await fetch(`${GRAPH_BASE}/me/onenote/notebooks/${notebookId}/sections`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.value ?? []
}

export async function listPages(accessToken: string, sectionId: string): Promise<OneNotePage[]> {
  const res = await fetch(`${GRAPH_BASE}/me/onenote/sections/${sectionId}/pages?$top=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.value ?? []
}

export async function getPageContent(accessToken: string, pageId: string): Promise<string> {
  const res = await fetch(`${GRAPH_BASE}/me/onenote/pages/${pageId}/content`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const html = await res.text()
  // Strip HTML tags to get plain text
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
