'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, GitMerge, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { initials } from '@/lib/utils'
import type { Duplicate } from '@/lib/supabase'

export default function VerifyPage() {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  async function fetchDuplicates() {
    const res = await fetch('/api/duplicates').catch(() => null)
    const data = res ? await res.json() : {}
    setDuplicates(data.duplicates ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchDuplicates() }, [])

  async function handleAction(id: string, action: 'merge' | 'dismiss', keepId?: string) {
    setProcessing(id)
    await fetch('/api/duplicates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, keep_id: keepId }),
    })
    setProcessing(null)
    fetchDuplicates()
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Data Verification</h1>
        <p className="text-gray-500 mt-1">Review potential duplicate contacts found during sync</p>
      </div>

      {duplicates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <CheckCircle size={48} className="mx-auto mb-3 text-green-400" />
          <p className="text-gray-600 font-medium">No duplicates to review</p>
          <p className="text-sm text-gray-400 mt-1">The system will flag potential duplicates here when it finds matching contacts</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <AlertTriangle size={14} className="text-yellow-500" />
            {duplicates.length} potential {duplicates.length === 1 ? 'duplicate' : 'duplicates'} found
          </p>

          {duplicates.map(dup => {
            const c1 = dup.contact_1
            const c2 = dup.contact_2
            if (!c1 || !c2) return null

            return (
              <div key={dup.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">
                      {Math.round(dup.similarity_score * 100)}% match
                    </Badge>
                    {dup.match_fields.map(f => (
                      <Badge key={f} variant="secondary">{f}</Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction(dup.id, 'dismiss')}
                    disabled={processing === dup.id}
                  >
                    <XCircle size={14} className="mr-1 text-gray-400" />
                    Not a duplicate
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[c1, c2].map((contact, idx) => (
                    <div key={contact.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {initials(contact.full_name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{contact.full_name}</p>
                          {contact.title && <p className="text-xs text-gray-500">{contact.title}</p>}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {contact.company && <p><span className="text-gray-400">Company:</span> {contact.company}</p>}
                        {contact.email && <p><span className="text-gray-400">Email:</span> {contact.email}</p>}
                        {contact.phone && <p><span className="text-gray-400">Phone:</span> {contact.phone}</p>}
                        <p><span className="text-gray-400">Sources:</span> {contact.sources.join(', ')}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => handleAction(dup.id, 'merge', contact.id)}
                        disabled={processing === dup.id}
                      >
                        <GitMerge size={12} className="mr-1" />
                        Keep this one{idx === 0 ? ' (merge other)' : ' (merge other)'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
