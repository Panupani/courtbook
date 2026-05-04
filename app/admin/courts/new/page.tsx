export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import CourtForm from '@/components/admin/CourtForm'
import type { Venue } from '@/lib/types'

export default async function NewCourtPage() {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/admin')

  const supabase = await createClient()
  let query = supabase.from('venues').select('*').eq('is_active', true).order('name')
  if (!ctx.isSysAdmin) query = query.in('id', ctx.venueIds)
  const { data: venues } = await query

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Add New Court</h1>
      <CourtForm venues={(venues ?? []) as Venue[]} />
    </div>
  )
}
