import { useState, useEffect, useRef } from 'react'
import { searchCommanders, getCardImageUrl, getColorDisplay } from '@/services/scryfall'
import type { ScryfallCard } from '@/services/scryfall'

interface CommanderSearchProps {
  value: string
  onChange: (name: string, card?: ScryfallCard) => void
  placeholder?: string
}

export default function CommanderSearch({ value, onChange, placeholder = 'Buscar Commander...' }: CommanderSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<ScryfallCard[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (input: string) => {
    setQuery(input)
    setSelectedCard(null)
    onChange(input)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (input.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    debounceRef.current = setTimeout(async () => {
      const cards = await searchCommanders(input)
      setResults(cards)
      setIsOpen(cards.length > 0)
      setIsLoading(false)
    }, 300)
  }

  const handleSelect = (card: ScryfallCard) => {
    setQuery(card.name)
    setSelectedCard(card)
    setIsOpen(false)
    onChange(card.name, card)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 pr-8"
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⏳</span>
        )}
      </div>

      {/* Selected card preview */}
      {selectedCard && (
        <div className="mt-2 flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
          {getCardImageUrl(selectedCard) && (
            <img
              src={getCardImageUrl(selectedCard, 'small')!}
              alt={selectedCard.name}
              className="w-12 h-auto rounded"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedCard.name}</p>
            <p className="text-xs text-gray-400">{getColorDisplay(selectedCard.color_identity)}</p>
          </div>
        </div>
      )}

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleSelect(card)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
            >
              {getCardImageUrl(card, 'small') && (
                <img
                  src={getCardImageUrl(card, 'small')!}
                  alt={card.name}
                  className="w-8 h-auto rounded flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{card.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {getColorDisplay(card.color_identity)} • {card.type_line}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
