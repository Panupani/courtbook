export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAdminContext } from '@/lib/admin'
import { formatPrice } from '@/lib/utils'
import DeleteCourtButton from './DeleteCourtButton'

export default async function AdminCourtsPage() {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/')

  const supabase = await createClient()
  let query = supabase.from('courts').select('*, venue:venues(name)').order('name')
  if (!ctx.isSysAdmin) query = query.in('venue_id', ctx.venueIds)
  const { data: courts } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Courts</h1>
        <Link href="/admin/courts/new" className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700">
          + Add Court
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {!courts || courts.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p>No courts yet.</p>
            <Link href="/admin/courts/new" className="mt-3 inline-block text-green-600 font-semibold hover:underline">
              Add your first court →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Court</th>
                <th className="px-5 py-3 text-left hidden md:table-cell">Venue</th>
                <th className="px-5 py-3 text-left">Rate / hr</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {courts.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">{c.name}</td>
                  <td className="px-5 py-4 text-gray-500 hidden md:table-cell">{c.venue?.name}</td>
                  <td className="px-5 py-4 text-gray-700">{formatPrice(c.hourly_rate)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-3">
                    <Link href={`/admin/courts/${c.id}/edit`} className="text-blue-600 hover:underline text-xs font-medium">Edit</Link>
                    <DeleteCourtButton id={c.id} />
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
