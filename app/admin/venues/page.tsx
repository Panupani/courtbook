export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DeleteVenueButton from './DeleteVenueButton'

export default async function AdminVenuesPage() {
  const supabase = await createClient()
  const { data: venues } = await supabase.from('venues').select('*').order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
        <Link href="/admin/venues/new" className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700">
          + Add Venue
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {!venues || venues.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p>No venues yet.</p>
            <Link href="/admin/venues/new" className="mt-3 inline-block text-green-600 font-semibold hover:underline">Create your first venue →</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Address</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {venues.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{v.name}</td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{v.address}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-3">
                    <Link href={`/admin/venues/${v.id}/edit`} className="text-blue-600 hover:underline text-xs font-medium">Edit</Link>
                    <DeleteVenueButton id={v.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
