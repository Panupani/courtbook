'use client'

import { useState, useTransition } from 'react'
import { addTransaction } from '@/app/farm/actions'
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, type TransactionType } from '@/lib/farm-types'

export default function TransactionForm() {
  const [type, setType]       = useState<TransactionType>('income')
  const [error, setError]     = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const today = new Date().toISOString().split('T')[0]

  function handleSubmit(formData: FormData) {
    formData.set('type', type)
    setError(null)
    startTransition(async () => {
      try {
        await addTransaction(formData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div>
        <label className="block text-base font-semibold text-zinc-700 mb-2">ประเภท</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-4 rounded-xl text-lg font-bold border-2 transition-all ${
              type === 'income'
                ? 'bg-green-600 border-green-600 text-white shadow-md'
                : 'bg-white border-zinc-200 text-zinc-500 hover:border-green-300'
            }`}
          >
            💰 รายรับ
          </button>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-4 rounded-xl text-lg font-bold border-2 transition-all ${
              type === 'expense'
                ? 'bg-red-500 border-red-500 text-white shadow-md'
                : 'bg-white border-zinc-200 text-zinc-500 hover:border-red-300'
            }`}
          >
            💸 รายจ่าย
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label htmlFor="amount" className="block text-base font-semibold text-zinc-700 mb-2">
          จำนวนเงิน (บาท)
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-zinc-400">฿</span>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            required
            placeholder="0.00"
            className="w-full pl-10 pr-4 py-4 text-2xl font-bold border-2 border-zinc-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-base font-semibold text-zinc-700 mb-2">
          หมวดหมู่
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="w-full px-4 py-4 text-lg border-2 border-zinc-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white"
        >
          <option value="" disabled>เลือกหมวดหมู่...</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label htmlFor="transaction_date" className="block text-base font-semibold text-zinc-700 mb-2">
          วันที่
        </label>
        <input
          id="transaction_date"
          name="transaction_date"
          type="date"
          required
          defaultValue={today}
          max={today}
          className="w-full px-4 py-4 text-lg border-2 border-zinc-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
        />
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="description" className="block text-base font-semibold text-zinc-700 mb-2">
          หมายเหตุ <span className="font-normal text-zinc-400">(ไม่บังคับ)</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          placeholder="เช่น ขายเห็ดนางฟ้า 5 กิโล"
          className="w-full px-4 py-4 text-base border-2 border-zinc-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors"
        />
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl">{error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`w-full py-5 rounded-xl text-xl font-bold text-white transition-all ${
          type === 'income'
            ? 'bg-green-600 hover:bg-green-700 active:bg-green-800'
            : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
        } disabled:opacity-60 shadow-md`}
      >
        {pending ? 'กำลังบันทึก...' : '✓ บันทึก'}
      </button>
    </form>
  )
}
