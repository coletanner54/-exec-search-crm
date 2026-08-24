'use client'

import { useEffect, useState } from 'react'
import { Plus, X, ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Search } from '@/lib/supabase'

export default function SearchesPage() {
  const [searches, setSearches] = useState<Search[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', coda_doc_id: '', coda_table_id: '' })
  const [syncing, setSyncing] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function fetchSearches() {
    const res = await fetch('/api/searches').catch(() => null)
    const data = res ? await res.json() : {}
    setSearches(data.searches ?? [])
  }

  useEffect(() => { fetchSearches() }, [])

  async function addSearch(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); return }
    setShowAdd(false)
    setForm({ name: '', coda_doc_id: '', coda_table_id: '' })
    fetchSearches()
  }

  async function syncSearch(id: string) {
    setSyncing(id)
    await fetch('/api/sync/coda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_id: id }),
    })
    setSyncing(null)
    fetchSearches()
  }

  const statusColor: Record<string, 'success' | 'warning' | 'secondary'> = {
    active: 'success',
    on_hold: 'warning',
    closed: 'secondary',
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Searches</h1>
          <p className="text-gray-500 mt-1">Each search is linked to a Coda database table</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} className="mr-2" /> Link Coda Search
        </Button>
      </div>

      {searches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No searches linked yet</p>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Click &quot;Link Coda Search&quot; to connect a Coda document and table.
            You&apos;ll need the Document ID and Table ID from Coda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {searches.map(search => (
            <div key={search.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900">{search.name}</h3>
                  <Badge variant={statusColor[search.status]}>{search.status}</Badge>
                </div>
                <p className="text-sm text-gray-500">
                  Doc: <code className="bg-gray-100 px-1 rounded text-xs">{search.coda_doc_id}</code>
                  {' · '}
                  Table: <code className="bg-gray-100 px-1 rounded text-xs">{search.coda_table_id}</code>
                </p>
                <p className="text-xs text-gray-400 mt-1">Added {formatDate(search.created_at)}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncSearch(search.id)}
                  disabled={syncing === search.id}
                >
                  <RefreshCw size={14} className={`mr-1 ${syncing === search.id ? 'animate-spin' : ''}`} />
                  {syncing === search.id ? 'Syncing...' : 'Sync Now'}
                </Button>
                <a href={`https://coda.io/d/${search.coda_doc_id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm"><ExternalLink size={14} /></Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How to find Coda IDs */}
      <div className="mt-8 bg-blue-50 rounded-xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2">How to find your Coda Document ID and Table ID</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Open your Coda doc in the browser</li>
          <li>2. The URL looks like: <code className="bg-blue-100 px-1 rounded">coda.io/d/Search-Name_<strong>dXXXXXXXX</strong></code> — the part starting with <strong>d</strong> is your Doc ID</li>
          <li>3. Click on the table in Coda, then click the &quot;...&quot; menu → &quot;Copy table ID&quot;</li>
        </ol>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Link a Coda Search</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            {error && <p className="text-red-600 text-sm mb-3 bg-red-50 p-3 rounded">{error}</p>}
            <form onSubmit={addSearch} className="space-y-3">
              <Input required placeholder="Search name (e.g. CFO Search - Acme Corp)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input required placeholder="Coda Document ID (e.g. dXXXXXXXX)" value={form.coda_doc_id} onChange={e => setForm(f => ({ ...f, coda_doc_id: e.target.value }))} />
              <Input required placeholder="Coda Table ID (e.g. grid-XXXXXXXX)" value={form.coda_table_id} onChange={e => setForm(f => ({ ...f, coda_table_id: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Link Search</Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
