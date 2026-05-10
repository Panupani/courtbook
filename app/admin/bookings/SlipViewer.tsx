'use client'

import { useState } from 'react'

export default function SlipViewer({ url }: { url: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="View payment slip"
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
      >
        🧾 Slip
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-800 text-sm">Payment Slip</p>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-base"
              >
                ✕
              </button>
            </div>

            {/* Image */}
            <div className="p-3 bg-gray-50">
              <img
                src={url}
                alt="Payment slip"
                className="w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>

            {/* Footer */}
            <div className="px-4 py-3 flex justify-end gap-2 border-t border-gray-100">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                ↗ Open full size
              </a>
              <button
                onClick={() => setOpen(false)}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
