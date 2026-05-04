import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-6xl mb-4">🏸</div>
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="mt-3 text-gray-500">This page doesn&apos;t exist or has been removed.</p>
        <Link href="/" className="mt-6 inline-block bg-green-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  )
}
