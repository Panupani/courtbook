import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransactionForm from '@/components/farm/TransactionForm'

export const metadata = { title: 'บันทึกรายการ — ฟาร์มเห็ด' }

export default async function AddTransactionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
      <h1 className="text-xl font-bold text-zinc-900 mb-6">บันทึกรายการใหม่</h1>
      <TransactionForm />
    </div>
  )
}
