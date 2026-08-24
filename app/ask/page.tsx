'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { initials } from '@/lib/utils'

type Message = {
  role: 'user' | 'assistant'
  content: string
  contacts?: Array<{ id: string; full_name: string; title?: string; company?: string }>
}

const EXAMPLE_QUESTIONS = [
  'Find candidates with CFO experience in healthcare',
  'Who has private equity background?',
  'Show me candidates in New York with 20+ years experience',
  'Which candidates have worked at Fortune 500 companies?',
]

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return

    const userMsg: Message = { role: 'user', content: question }
    setMessages(m => [...m, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()

      setMessages(m => [...m, {
        role: 'assistant',
        content: data.answer ?? 'Sorry, I could not find an answer.',
        contacts: data.contacts?.slice(0, 5),
      }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Please check your API key is set up.' }])
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-gray-200 bg-white p-4">
        <h1 className="text-lg font-bold text-gray-900">Ask AI</h1>
        <p className="text-sm text-gray-500">Ask questions about your contacts and search notes</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot size={32} className="text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Search your database with AI</h2>
              <p className="text-gray-500 text-sm">
                Ask anything about your candidates, notes, and search history.
                The AI reads your actual data to answer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {EXAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-600"
                >
                  &quot;{q}&quot;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-200'}`}>
              {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-gray-600" />}
            </div>
            <div className={`flex-1 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              <div className={`rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                <p className="whitespace-pre-line">{msg.content}</p>
              </div>

              {msg.contacts && msg.contacts.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-3 w-full">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Referenced contacts:</p>
                  <div className="space-y-2">
                    {msg.contacts.map(c => (
                      <div key={c.id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {initials(c.full_name)}
                        </div>
                        <span className="text-sm text-gray-700">{c.full_name}{c.title ? ` · ${c.title}` : ''}{c.company ? ` at ${c.company}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-3xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot size={16} className="text-gray-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white p-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about your candidates, notes, or searches..."
            disabled={loading}
          />
          <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
