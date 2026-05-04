export const dynamic = 'force-dynamic'

import VenueForm from '@/components/admin/VenueForm'

export default function NewVenuePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Add New Venue</h1>
      <VenueForm />
    </div>
  )
}
