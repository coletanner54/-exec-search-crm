'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Search, SyncLog } from '@/lib/supabase'

export default function SyncPage() {
  const [searches, setSearches] = useState<Search[]>([])
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)

  async function fetchData() {
    const [sRes, lRes] = await Promise.all([
      fetch('/api/searches').catch(() => null),
      fetch('/api/sync/logs').catch(() => null),
    ])
    const sData = sRes ? await sRes.json() : {}
    const lData = lRes ? await lRes.json() : {}
    setSearches(sData.searches ?? [])
    setLogs(lData.logs ?? [])
  }

  useEffect(() => { fetchData() }, [])

  async function syncOne(id: string) {
    setSyncing(id)
    await fetch('/api/sync/coda', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search_id: id }),
    })
    setSyncing(null)
    fetchData()
  }

  async function syncAll() {
    setSyncingAll(true)
    for (const s of searches.filter(s => s.status === 'active')) {
      await syncOne(s.id)
    }
    setSyncingAll(false)
  }

  const statusIcon = {
    success: <CheckCircle size={16} className="text-green-500" />,
    error: <XCircle size={16} className="text-red-500" />,
    partial: <Clock size={16} className="text-yellow-500" />,
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync</h1>
          <p className="text-gray-500 mt-1">Pull the latest data from Coda into your CRM</p>
        </div>
        <Button onClick={syncAll} disabled={syncingAll}>
          <RefreshCw size={16} className={`mr-2 ${syncingAll ? 'animate-spin' : ''}`} />
          {syncingAll ? 'Syncing all...' : 'Sync All Active Searches'}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <strong>Automatic sync:</strong> Once deployed to Vercel, this system will automatically sync all active searches 4 times per day (every 6 hours). You can also sync manually at any time.
      </div>

      <div className="space-y-3 mb-8">
        {searches.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{s.name}</p>
              <Badge variant={s.status === 'active' ? 'success' : 'secondary'} className="mt-1">{s.status}</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncOne(s.id)}
              disabled={syncing === s.id || s.status !== 'active'}
            >
              <RefreshCw size={14} className={`mr-1 ${syncing === s.id ? 'animate-spin' : ''}`} />
              {syncing === s.id ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
        ))}
      </div>

      {logs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Sync History</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Source</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Added</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Updated</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Notes</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {statusIcon[log.status]}
                        <span className="capitalize">{log.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{log.source}</td>
                    <td className="px-4 py-3 text-green-600">+{log.contacts_added}</td>
                    <td className="px-4 py-3 text-blue-600">~{log.contacts_updated}</td>
                    <td className="px-4 py-3 text-gray-600">+{log.notes_added}</td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(log.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
