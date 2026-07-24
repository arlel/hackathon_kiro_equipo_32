import { useState, useEffect, useRef } from 'react'
import { searchCommanders, getCardImageUrl, getColorDisplay, hasPartnerAbility } from '@/services/scryfall'
import type { ScryfallCard } from '@/services/scryfall'

interface CommanderSearchProps {
  value: string
  onChange: (name: string, card?: ScryfallCard) => void
  onSelect?: (commander: { name: string; image: string }, partner?: { name: string; image: string }) => void
  placeholder?: string
}

export default function CommanderSearch({ value, onChange, onSelect, placeholder = 'Buscar Commander...' }: CommanderSearchProps) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<ScryfallCard[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<ScryfallCard | null>(null)

  // Partner state
  const [showPartner, setShowPartner] = useState(false)
  const [partnerQuery, setPartnerQuery] = useState('')
  const [partnerResults, setPartnerResults] = useState<ScryfallCard[]>([])
  const [isPartnerOpen, setIsPartnerOpen] = useState(false)
  const [isPartnerLoading, setIsPartnerLoading] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<ScryfallCard | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const partnerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const partnerContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
      if (partnerContainerRef.current && !partnerContainerRef.current.contains(e.target as Node)) {
        setIsPartnerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const emitOnSelect = (commander: ScryfallCard, partner: ScryfallCard | null) => {
    if (!onSelect) return
    const commanderData = {
      name: commander.name,
      image: getCardImageUrl(commander, 'art_crop') || '',
    }
    if (partner) {
      const partnerData = {
        name: partner.name,
        image: getCardImageUrl(partner, 'art_crop') || '',
      }
      onSelect(commanderData, partnerData)
    } else {
      onSelect(commanderData)
    }
  }

  const handleInputChange = (input: string) => {
    setQuery(input)
    setSelectedCard(null)
    setShowPartner(false)
    setSelectedPartner(null)
    setPartnerQuery('')
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

    // Detect Partner ability
    const hasPartner = hasPartnerAbility(card)
    setShowPartner(hasPartner)

    if (!hasPartner) {
      setSelectedPartner(null)
      setPartnerQuery('')
      emitOnSelect(card, null)
    }
  }

  const handlePartnerInputChange = (input: string) => {
    setPartnerQuery(input)
    setSelectedPartner(null)

    if (partnerDebounceRef.current) clearTimeout(partnerDebounceRef.current)

    if (input.length < 2) {
      setPartnerResults([])
      setIsPartnerOpen(false)
      return
    }

    setIsPartnerLoading(true)
    partnerDebounceRef.current = setTimeout(async () => {
      const cards = await searchCommanders(input)
      // Filter out the already-selected commander
      const filtered = cards.filter((c) => c.id !== selectedCard?.id)
      setPartnerResults(filtered)
      setIsPartnerOpen(filtered.length > 0)
      setIsPartnerLoading(false)
    }, 300)
  }

  const handlePartnerSelect = (card: ScryfallCard) => {
    setPartnerQuery(card.name)
    setSelectedPartner(card)
    setIsPartnerOpen(false)

    if (selectedCard) {
      emitOnSelect(selectedCard, card)
    }
  }

  const handleClearPartner = () => {
    setSelectedPartner(null)
    setPartnerQuery('')
    if (selectedCard) {
      emitOnSelect(selectedCard, null)
    }
  }

  return (
    <div className="w-full space-y-2">
      {/* Main commander search */}
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
              {showPartner && (
                <p className="text-xs text-purple-400">✨ Partner</p>
              )}
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

      {/* Partner search field — shown only when selected commander has Partner */}
      {showPartner && (
        <div ref={partnerContainerRef} className="relative w-full">
          <label className="block text-xs text-gray-400 mb-1">Partner (opcional)</label>
          <div className="relative">
            <input
              type="text"
              value={partnerQuery}
              onChange={(e) => handlePartnerInputChange(e.target.value)}
              onFocus={() => partnerResults.length > 0 && setIsPartnerOpen(true)}
              placeholder="Buscar Partner..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 pr-8"
            />
            {isPartnerLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">⏳</span>
            )}
          </div>

          {/* Selected partner preview */}
          {selectedPartner && (
            <div className="mt-2 flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
              {getCardImageUrl(selectedPartner) && (
                <img
                  src={getCardImageUrl(selectedPartner, 'small')!}
                  alt={selectedPartner.name}
                  className="w-12 h-auto rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedPartner.name}</p>
                <p className="text-xs text-gray-400">{getColorDisplay(selectedPartner.color_identity)}</p>
              </div>
              <button
                type="button"
                onClick={handleClearPartner}
                className="text-gray-500 hover:text-red-400 text-sm"
                aria-label="Quitar partner"
              >
                ✕
              </button>
            </div>
          )}

          {/* Partner dropdown results */}
          {isPartnerOpen && (
            <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
              {partnerResults.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handlePartnerSelect(card)}
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
      )}
    </div>
  )
}
