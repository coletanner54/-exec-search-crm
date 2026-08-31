'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, Phone, Link2, Plus, X, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { initials, formatDate } from '@/lib/utils'
import type { Contact, ContactNote } from '@/lib/supabase'

type ContactWithNotes = Contact & { notes?: ContactNote[] }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<ContactWithNotes | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', company: '', title: '', linkedin_url: '', location: '' })
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (query) params.set('q', query)
    const res = await fetch(`/api/contacts?${params}`).catch(() => null)
    const data = res ? await res.json() : {}
    setContacts(data.contacts ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [query, page])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  async function selectContact(contact: Contact) {
    const res = await fetch(`/api/contacts/${contact.id}/notes`).catch(() => null)
    const data = res ? await res.json() : {}
    setSelected({ ...contact, notes: data.notes ?? [] })
    setNewNote('')
  }

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setShowAdd(false)
    setForm({ full_name: '', email: '', phone: '', company: '', title: '', linkedin_url: '', location: '' })
    fetchContacts()
  }

  async function saveNote() {
    if (!selected || !newNote.trim()) return
    setSavingNote(true)
    const res = await fetch(`/api/contacts/${selected.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newNote.trim() }),
    }).catch(() => null)
    const data = res ? await res.json() : {}
    if (data.note) {
      setSelected(s => s ? { ...s, notes: [data.note, ...(s.notes ?? [])] } : s)
      setNewNote('')
    }
    setSavingNote(false)
  }

  const sourceLabel: Record<string, string> = {
    'ct-notes': 'CT Notes',
    'coda': 'Coda',
    'onenote': 'OneNote',
    'manual': 'Manual',
  }

  return (
    <div className="flex h-screen">
      {/* Contact list */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Contacts</h1>
              <p className="text-xs text-gray-500">{total.toLocaleString()} records</p>
            </div>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} className="mr-1" /> Add
            </Button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, company..."
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {query ? 'No contacts match your search' : 'No contacts yet — sync from Coda to get started'}
            </div>
          ) : (
            contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => selectContact(contact)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selected?.id === contact.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initials(contact.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{contact.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[contact.title, contact.company].filter(Boolean).join(' · ') || 'No details'}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {total > 50 && (
          <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-blue-600 disabled:text-gray-300">Prev</button>
            <span className="text-gray-500">Page {page} of {Math.ceil(total / 50)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)} className="text-blue-600 disabled:text-gray-300">Next</button>
          </div>
        )}
      </div>

      {/* Contact detail */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {selected ? (
          <div className="max-w-2xl mx-auto p-8">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {initials(selected.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900">{selected.full_name}</h2>
                  {selected.title && (
                    <p className="text-gray-700 mt-0.5">{selected.title}</p>
                  )}
                  {selected.company && (
                    <p className="text-gray-500 text-sm">{selected.company}</p>
                  )}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {selected.linkedin_url && (
                      <a
                        href={selected.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Link2 size={14} />
                        LinkedIn
                      </a>
                    )}
                    {selected.phone && (
                      <a
                        href={`tel:${selected.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Phone size={14} />
                        {selected.phone}
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3 flex-wrap">
                    {selected.sources.map(s => (
                      <Badge key={s} variant="secondary">{sourceLabel[s] ?? s}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Notes</h3>

              {/* Existing notes */}
              {selected.notes && selected.notes.length > 0 ? (
                <div className="space-y-3 mb-6">
                  {selected.notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {sourceLabel[note.source] ?? note.source}
                        </span>
                        {note.note_date && (
                          <span className="text-xs text-gray-400">· {formatDate(note.note_date)}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-6">No notes yet for this contact.</p>
              )}

              {/* Add note */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Add a note</p>
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Type your note here..."
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    onClick={saveNote}
                    disabled={savingNote || !newNote.trim()}
                  >
                    <Send size={13} className="mr-1.5" />
                    {savingNote ? 'Saving...' : 'Save Note'}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-3 px-1">Last updated {formatDate(selected.updated_at)}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Search size={28} className="opacity-40" />
              </div>
              <p className="text-sm">Select a contact to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Add contact modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Contact</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <form onSubmit={addContact} className="space-y-3">
              <Input required placeholder="Full name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              <Input placeholder="Current role" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              <Input placeholder="LinkedIn URL" value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))} />
              <Input placeholder="Cell number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <Input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <Input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Add Contact</Button>
                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
