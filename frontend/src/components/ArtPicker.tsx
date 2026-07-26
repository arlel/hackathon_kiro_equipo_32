import { useState, useEffect, useRef } from 'react'
import { getCardArtVariants } from '@/services/scryfall'

interface ArtPickerProps {
  commanderName: string
  currentArt?: string
  onSelect: (artUrl: string) => void
}

export default function ArtPicker({ commanderName, currentArt, onSelect }: ArtPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [variants, setVariants] = useState<{ id: string; artCrop: string; setName: string }[]>([])
  const [loading, setLoading] = useState(false)
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

  const handleOpen = async () => {
    if (isOpen) {
      setIsOpen(false)
      return
    }
    setIsOpen(true)
    if (variants.length === 0) {
      setLoading(true)
      const arts = await getCardArtVariants(commanderName)
      setVariants(arts)
      setLoading(false)
    }
  }

  if (!commanderName) return null

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Paint brush button */}
      <button
        type="button"
        onClick={handleOpen}
        className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white transition-colors"
        title="Cambiar arte"
        aria-label="Cambiar arte del comandante"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M15.993 1.385a1.87 1.87 0 012.622 2.622l-4.522 4.522a1 1 0 01-.414.263l-2.792.93a.5.5 0 01-.632-.632l.93-2.792a1 1 0 01.263-.414l4.545-4.499zM3.5 7A1.5 1.5 0 002 8.5v8A1.5 1.5 0 003.5 18h8a1.5 1.5 0 001.5-1.5v-3a.5.5 0 011 0v3A2.5 2.5 0 0111.5 19h-8A2.5 2.5 0 011 16.5v-8A2.5 2.5 0 013.5 6h3a.5.5 0 010 1h-3z" />
        </svg>
      </button>

      {/* Art variants dropdown */}
      {isOpen && (
        <div className="absolute z-50 right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto">
          <p className="text-xs text-gray-400 mb-2 px-1">Artes disponibles</p>

          {loading && (
            <p className="text-xs text-gray-500 text-center py-4">Cargando artes...</p>
          )}

          {!loading && variants.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-4">No se encontraron variantes</p>
          )}

          {!loading && variants.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5">
              {variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => {
                    onSelect(variant.artCrop)
                    setIsOpen(false)
                  }}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    currentArt === variant.artCrop
                      ? 'border-purple-500 ring-1 ring-purple-400'
                      : 'border-transparent hover:border-gray-600'
                  }`}
                >
                  <img
                    src={variant.artCrop}
                    alt={variant.setName}
                    className="w-full h-16 object-cover"
                  />
                  <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[10px] text-gray-300 text-center py-0.5 truncate px-1">
                    {variant.setName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
