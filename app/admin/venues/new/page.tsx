export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import VenueForm from '@/components/admin/VenueForm'

export default async function NewVenuePage() {
  const supabase = await createClient()
  const { data: zones } = await supabase.from('zones').select('*').order('name')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Add New Venue</h1>
      <VenueForm zones={zones ?? []} />
    </div>
  )
}
