import { useState } from 'react'

interface RoomSettingsProps {
  poisonEnabled: boolean
  turnCounterEnabled: boolean
  onTogglePoison: (enabled: boolean) => void
  onToggleTurnCounter: (enabled: boolean) => void
  /** Only shown in local rooms — allows adding players mid-game */
  onAddPlayer?: () => void
  showAddPlayer?: boolean
}

export default function RoomSettings({
  poisonEnabled,
  turnCounterEnabled,
  onTogglePoison,
  onToggleTurnCounter,
  onAddPlayer,
  showAddPlayer = false,
}: RoomSettingsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      {/* Gear button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded-lg transition-colors ${
          isOpen ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
        title="Configuración de sala"
        aria-label="Configuración de sala"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 01.804.98v1.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.295 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.295A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.295-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Settings dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 space-y-3 z-50">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Configuración</p>

          {/* Poison toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-200">☠️ Veneno</span>
            <button
              type="button"
              role="switch"
              aria-checked={poisonEnabled}
              onClick={() => onTogglePoison(!poisonEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                poisonEnabled ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  poisonEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* Turn counter toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-200">🔄 Turnos</span>
            <button
              type="button"
              role="switch"
              aria-checked={turnCounterEnabled}
              onClick={() => onToggleTurnCounter(!turnCounterEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                turnCounterEnabled ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  turnCounterEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>

          {/* Add player button (local rooms only) */}
          {showAddPlayer && onAddPlayer && (
            <>
              <div className="border-t border-gray-700" />
              <button
                type="button"
                onClick={() => {
                  onAddPlayer()
                  setIsOpen(false)
                }}
                className="w-full text-left text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
              >
                <span>➕</span>
                <span>Agregar jugador</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
