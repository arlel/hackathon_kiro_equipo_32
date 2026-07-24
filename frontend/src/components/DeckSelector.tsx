import { useState, useEffect } from 'react'
import { listDecks } from '@/services/api'
import type { GameFormat, DeckRecord } from '@/types/game'

interface DeckSelectorProps {
  format: GameFormat
  onSelect: (deck: {
    id: string
    commanderName?: string
    commanderImage?: string
    partnerName?: string
    partnerImage?: string
  }) => void
}

export default function DeckSelector({ format, onSelect }: DeckSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [decks, setDecks] = useState<DeckRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadDecks()
    }
  }, [isOpen])

  const loadDecks = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const allDecks = await listDecks()
      setDecks(allDecks.filter((d) => d.format === format && d.status === 'active'))
    } catch {
      setError('No se pudieron cargar los mazos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = () => {
    setIsOpen((prev) => !prev)
  }

  const handleSelectDeck = (deck: DeckRecord) => {
    setSelectedDeckId(deck.id)
    onSelect({
      id: deck.id,
      commanderName: deck.commanderName,
      commanderImage: deck.commanderImage,
      partnerName: deck.partnerName,
      partnerImage: deck.partnerImage,
    })
  }

  const handleClear = () => {
    setSelectedDeckId(null)
    onSelect({
      id: '',
      commanderName: undefined,
      commanderImage: undefined,
      partnerName: undefined,
      partnerImage: undefined,
    })
  }

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isOpen
            ? 'bg-purple-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <span>📦</span>
        <span>Mis Mazos</span>
        <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Deck list panel */}
      {isOpen && (
        <div className="mt-2 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          {isLoading && (
            <div className="px-4 py-3 text-gray-400 text-sm">Cargando mazos...</div>
          )}

          {error && (
            <div className="px-4 py-3 text-red-400 text-sm">{error}</div>
          )}

          {!isLoading && !error && decks.length === 0 && (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No tienes mazos activos para este formato.
            </div>
          )}

          {!isLoading && !error && decks.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              {/* Clear selection option */}
              <button
                type="button"
                onClick={handleClear}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                  selectedDeckId === null
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800'
                }`}
              >
                <span className="text-gray-500">✕</span>
                <span>Sin mazo</span>
              </button>

              {decks.map((deck) => (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => handleSelectDeck(deck)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                    selectedDeckId === deck.id
                      ? 'bg-purple-900/40 border-l-2 border-purple-500'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  {deck.commanderImage && (
                    <img
                      src={deck.commanderImage}
                      alt={deck.commanderName || deck.name}
                      className="w-8 h-8 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{deck.name}</p>
                    {deck.commanderName && (
                      <p className="text-xs text-gray-400 truncate">
                        {deck.commanderName}
                        {deck.partnerName && ` + ${deck.partnerName}`}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
