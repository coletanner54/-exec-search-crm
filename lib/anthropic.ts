import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateEmbedding(text: string): Promise<number[]> {
  // Claude doesn't have a dedicated embeddings endpoint; we use a simple hash approach
  // for demo, then replace with a proper embeddings service (OpenAI or Cohere)
  // For now return a placeholder — the semantic search will use text search as fallback
  return []
}

export async function askQuestion(
  question: string,
  context: { contacts: unknown[]; notes: unknown[] }
): Promise<string> {
  const contextText = buildContextText(context)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: `You are an assistant for an executive search firm. You have access to a database of contacts and notes from ongoing executive searches.

Answer the user's question based ONLY on the provided context. If a contact or piece of information is not in the context, say so clearly.
Format your answers clearly. When referencing a person, always include their name, current company, and title if available.`,
    messages: [
      {
        role: 'user',
        content: `Here is the relevant context from our database:\n\n${contextText}\n\n---\n\nQuestion: ${question}`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

function buildContextText(context: { contacts: unknown[]; notes: unknown[] }): string {
  const parts: string[] = []

  if (context.contacts.length > 0) {
    parts.push('## CONTACTS\n')
    for (const c of context.contacts as Record<string, unknown>[]) {
      parts.push(
        `- ${c.full_name}${c.title ? `, ${c.title}` : ''}${c.company ? ` at ${c.company}` : ''}${c.email ? ` | ${c.email}` : ''}${c.location ? ` | ${c.location}` : ''}`
      )
    }
  }

  if (context.notes.length > 0) {
    parts.push('\n## NOTES\n')
    for (const n of context.notes as Record<string, unknown>[]) {
      parts.push(`[${n.source}${n.note_date ? ` - ${n.note_date}` : ''}] ${n.content}`)
    }
  }

  return parts.join('\n') || 'No matching records found.'
}

export async function summarizeContact(notes: string[]): Promise<string> {
  if (notes.length === 0) return ''

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `Summarize the following notes about an executive search candidate in 2-3 sentences. Focus on their background, strengths, and any key observations:\n\n${notes.join('\n\n')}`,
      },
    ],
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}
