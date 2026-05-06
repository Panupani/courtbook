'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const type     = formData.get('type') as string
  const category = formData.get('category') as string
  const amount   = parseFloat(formData.get('amount') as string)
  const description     = (formData.get('description') as string).trim() || null
  const transaction_date = formData.get('transaction_date') as string

  if (!type || !category || isNaN(amount) || amount <= 0 || !transaction_date) {
    throw new Error('กรุณากรอกข้อมูลให้ครบถ้วน')
  }

  const { error } = await supabase.from('farm_transactions').insert({
    user_id: user.id,
    type,
    category,
    amount,
    description,
    transaction_date,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/farm')
  revalidatePath('/farm/history')
  redirect('/farm')
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('farm_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/farm')
  revalidatePath('/farm/history')
}
