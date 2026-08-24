import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function detectDuplicates(
  newContact: { full_name: string; email?: string | null },
  existing: { id: string; full_name: string; email?: string | null }[]
): { id: string; similarity_score: number; match_fields: string[] }[] {
  const matches: { id: string; similarity_score: number; match_fields: string[] }[] = []

  for (const contact of existing) {
    const matchFields: string[] = []
    let score = 0

    // Exact email match is a strong signal
    if (newContact.email && contact.email && newContact.email.toLowerCase() === contact.email.toLowerCase()) {
      matchFields.push('email')
      score += 0.9
    }

    // Name similarity (simple token overlap)
    const nameSimilarity = tokenOverlap(newContact.full_name, contact.full_name)
    if (nameSimilarity > 0.7) {
      matchFields.push('name')
      score += nameSimilarity * 0.5
    }

    if (score > 0.6) {
      matches.push({ id: contact.id, similarity_score: Math.min(score, 1), match_fields: matchFields })
    }
  }

  return matches
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/))
  const tokensB = new Set(b.toLowerCase().split(/\s+/))
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length
  const union = new Set([...tokensA, ...tokensB]).size
  return union === 0 ? 0 : intersection / union
}

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()
}
