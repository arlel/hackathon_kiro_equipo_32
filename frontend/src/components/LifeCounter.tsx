import { useCallback } from 'react'
import { useLongPress } from '@/hooks/useLongPress'

interface LifeCounterProps {
  life: number
  onAdjust: (amount: number) => void
}

export default function LifeCounter({ life, onAdjust }: LifeCounterProps) {
  const decrementHandlers = useLongPress({
    onShortPress: useCallback(() => onAdjust(-1), [onAdjust]),
    onLongPress: useCallback(() => onAdjust(-10), [onAdjust]),
    threshold: 500,
  })

  const incrementHandlers = useLongPress({
    onShortPress: useCallback(() => onAdjust(1), [onAdjust]),
    onLongPress: useCallback(() => onAdjust(10), [onAdjust]),
    threshold: 500,
  })

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease life"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xl font-bold select-none touch-manipulation transition-colors"
        {...decrementHandlers}
      >
        −
      </button>

      <span
        className="min-w-[60px] text-center font-bold text-white select-none"
        style={{ fontSize: '48px', lineHeight: 1.1 }}
      >
        {life}
      </span>

      <button
        type="button"
        aria-label="Increase life"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xl font-bold select-none touch-manipulation transition-colors"
        {...incrementHandlers}
      >
        +
      </button>
    </div>
  )
}
