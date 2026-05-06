export type TransactionType = 'income' | 'expense'

export interface FarmTransaction {
  id: string
  user_id: string
  type: TransactionType
  category: string
  amount: number
  description: string | null
  transaction_date: string
  created_at: string
}

export const INCOME_CATEGORIES = [
  'ขายเห็ดสด',       // Fresh mushroom sales
  'ขายเห็ดแห้ง',     // Dried mushroom sales
  'ขายสปอร์/เชื้อ',  // Spore/substrate sales
  'อื่นๆ',           // Other
] as const

export const EXPENSE_CATEGORIES = [
  'ก้อนเชื้อเห็ด',   // Mushroom substrate blocks
  'ค่าน้ำ',           // Water
  'ค่าไฟ',            // Electricity
  'วัสดุโรงเรือน',   // Growing house materials
  'แรงงาน',          // Labor
  'ขนส่ง',           // Transportation
  'บรรจุภัณฑ์',      // Packaging
  'อื่นๆ',           // Other
] as const

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number]
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export function formatTHB(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
