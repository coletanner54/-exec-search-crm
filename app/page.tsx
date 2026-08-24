'use client'

import { useEffect, useState } from 'react'
import { Users, Search, AlertTriangle } from 'lucide-react'

type Stats = {
  contacts: number
  searches: number
  duplicates: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ contacts: 0, searches: 0, duplicates: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/contacts?page=1').then(r => r.json()).catch(() => ({})),
      fetch('/api/searches').then(r => r.json()).catch(() => ({})),
      fetch('/api/duplicates').then(r => r.json()).catch(() => ({})),
    ]).then(([contactsRes, searchesRes, dupsRes]) => {
      setStats({
        contacts: contactsRes.total ?? 0,
        searches: searchesRes.searches?.length ?? 0,
        duplicates: dupsRes.duplicates?.length ?? 0,
      })
    })
  }, [])

  const statCards = [
    { label: 'Total Contacts', value: stats.contacts, icon: Users, color: 'bg-blue-500' },
    { label: 'Active Searches', value: stats.searches, icon: Search, color: 'bg-green-500' },
    { label: 'Pending Duplicates', value: stats.duplicates, icon: AlertTriangle, color: 'bg-yellow-500' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your executive search database</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
              </div>
              <div className={`${color} p-3 rounded-lg`}>
                <Icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 w-5">1.</span>
            Go to <strong>Searches</strong> to link your Coda databases — each search is one engagement
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 w-5">2.</span>
            Click <strong>Sync</strong> to pull contacts and notes from Coda into the system
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 w-5">3.</span>
            Browse <strong>Contacts</strong> to see your golden record database
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 w-5">4.</span>
            Use <strong>Ask AI</strong> to ask questions like &quot;Find CFOs with healthcare experience in Texas&quot;
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-blue-600 w-5">5.</span>
            Check <strong>Data Verification</strong> to review and merge any duplicate contacts
          </li>
        </ol>
      </div>
    </div>
  )
}
