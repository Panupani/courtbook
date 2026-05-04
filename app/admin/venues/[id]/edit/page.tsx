export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VenueForm from '@/components/admin/VenueForm'

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: venue } = await supabase.from('venues').select('*').eq('id', id).single()
  if (!venue) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Edit Venue</h1>
      <VenueForm venue={venue} />
    </div>
  )
}
