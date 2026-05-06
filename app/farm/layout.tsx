import FarmNav from '@/components/farm/FarmNav'

export const metadata = { title: 'Farm Manager — บัญชีฟาร์มเห็ด' }

export default function FarmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Farm header */}
      <div className="bg-green-700 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <p className="text-2xl font-bold">🍄 ฟาร์มเห็ด</p>
          <p className="text-green-200 text-sm mt-0.5">บันทึกรายรับ-รายจ่าย</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        <FarmNav />
        {children}
      </div>
    </div>
  )
}
