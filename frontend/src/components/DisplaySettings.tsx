import { useState } from 'react'

export type DisplayMode = 'all' | 'self' | 'compact'

interface DisplaySettingsProps {
  mode: DisplayMode
  onChange: (mode: DisplayMode) => void
}

export default function DisplaySettings({ mode, onChange }: DisplaySettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const options: { value: DisplayMode; label: string; icon: string }[] = [
    { value: 'all', label: 'Todos los jugadores', icon: '👥' },
    { value: 'self', label: 'Solo mi Commander', icon: '🎯' },
    { value: 'compact', label: 'Vista compacta', icon: '📋' },
  ]

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
          isOpen ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
        title="Opciones de visualización"
        aria-label="Opciones de visualización"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
          <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 z-50">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide px-2 mb-2">Vista</p>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                mode === opt.value
                  ? 'bg-blue-900/50 text-blue-300'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              {mode === opt.value && <span className="ml-auto text-blue-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
