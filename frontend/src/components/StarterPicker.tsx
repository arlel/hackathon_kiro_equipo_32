import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from '@/i18n/I18nContext'

interface StarterPickerProps {
  players: { id: string; username: string }[]
  selectedId: string | null
  onSelect: () => void
}

export default function StarterPicker({ players, selectedId, onSelect }: StarterPickerProps) {
  const { t } = useTranslation()
  const [animating, setAnimating] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const animationRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current)
      animationRef.current = null
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current)
      resultTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  // Start animation when selectedId changes from null to a value
  useEffect(() => {
    if (selectedId && players.length >= 2) {
      startAnimation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const startAnimation = () => {
    if (animating) return

    setAnimating(true)
    setShowResult(false)

    // Cycle through players rapidly, then slow down
    let speed = 80
    let elapsed = 0
    const duration = 2000 + Math.random() * 2000 // 2-4 seconds

    const cycle = () => {
      setCurrentIndex((prev) => (prev + 1) % players.length)
      elapsed += speed

      if (elapsed >= duration) {
        // Land on the selected player
        const selectedIdx = players.findIndex((p) => p.id === selectedId)
        if (selectedIdx !== -1) {
          setCurrentIndex(selectedIdx)
        }
        setAnimating(false)
        setShowResult(true)

        // Show result for 3 seconds
        resultTimerRef.current = setTimeout(() => {
          setShowResult(false)
        }, 3000)
        return
      }

      // Slow down as we approach the end
      const progress = elapsed / duration
      if (progress > 0.7) {
        speed = 80 + (progress - 0.7) * 600 // Slow down gradually
      }

      animationRef.current = setTimeout(cycle, speed)
    }

    cycle()
  }

  const handleSelect = () => {
    if (animating) return
    cleanup()
    setShowResult(false)
    onSelect()
  }

  const selectedPlayer = players.find((p) => p.id === selectedId)
  const displayPlayer = animating
    ? players[currentIndex]
    : showResult && selectedPlayer
      ? selectedPlayer
      : null

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Roulette display */}
      <div
        className={`
          relative w-full max-w-sm h-20 flex items-center justify-center
          rounded-xl bg-gray-800/80 border-2 transition-all duration-300
          ${showResult && !animating ? 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'border-gray-700'}
        `}
      >
        {displayPlayer ? (
          <span
            className={`
              text-2xl font-bold transition-all duration-150
              ${showResult && !animating ? 'text-yellow-300 scale-110' : 'text-white'}
              ${animating ? 'animate-pulse' : ''}
            `}
          >
            {displayPlayer.username}
          </span>
        ) : (
          <span className="text-gray-500 text-lg">
            {players.length < 2 ? t('starterPicker.needPlayers') : t('starterPicker.whoStarts')}
          </span>
        )}

        {/* Decorative arrows */}
        {(animating || showResult) && (
          <>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 text-xl">▶</div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-400 text-xl">◀</div>
          </>
        )}
      </div>

      {/* Winner announcement */}
      {showResult && !animating && selectedPlayer && (
        <p className="text-yellow-300 text-sm font-medium animate-fade-in">
          {t('starterPicker.starts', { name: selectedPlayer.username })}
        </p>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={handleSelect}
        disabled={animating || players.length < 2}
        className={`
          px-6 py-3 rounded-lg font-semibold text-sm
          transition-all duration-200
          ${animating || players.length < 2
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900 hover:from-yellow-400 hover:to-amber-500 active:scale-95 shadow-lg hover:shadow-yellow-500/25'
          }
        `}
      >
        {animating ? t('starterPicker.selecting') : t('starterPicker.select')}
      </button>
    </div>
  )
}
