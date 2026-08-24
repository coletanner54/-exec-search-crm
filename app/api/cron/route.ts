import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// This endpoint is called by Vercel Cron on a schedule
// It triggers a sync for every active search
export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data: searches } = await db.from('searches').select('id').eq('status', 'active')

  if (!searches?.length) {
    return NextResponse.json({ message: 'No active searches to sync' })
  }

  const results = await Promise.allSettled(
    searches.map(search =>
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/sync/coda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_id: search.id }),
      })
    )
  )

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ synced: succeeded, total: searches.length })
}
