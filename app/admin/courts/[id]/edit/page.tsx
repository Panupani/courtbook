export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CourtForm from '@/components/admin/CourtForm'
import type { Venue } from '@/lib/types'

export default async function EditCourtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [courtRes, venuesRes] = await Promise.all([
    supabase.from('courts').select('*').eq('id', id).single(),
    supabase.from('venues').select('*').order('name'),
  ])
  if (!courtRes.data) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Court</h1>
      <CourtForm court={courtRes.data} venues={(venuesRes.data ?? []) as Venue[]} />
    </div>
  )
}
