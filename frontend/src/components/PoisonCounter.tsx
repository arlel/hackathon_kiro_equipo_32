import { useLongPress } from '@/hooks/useLongPress'

interface PoisonCounterProps {
  poison: number
  onAdjust: (amount: number) => void
}

export default function PoisonCounter({ poison, onAdjust }: PoisonCounterProps) {
  const isLethal = poison >= 10

  const decrementHandlers = useLongPress({
    onShortPress: () => onAdjust(-1),
    onLongPress: () => onAdjust(-10),
    threshold: 500,
  })

  const incrementHandlers = useLongPress({
    onShortPress: () => onAdjust(1),
    onLongPress: () => onAdjust(10),
    threshold: 500,
  })

  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all ${
        isLethal
          ? 'border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
          : 'border border-gray-700'
      }`}
    >
      {/* Label with skull icon */}
      <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`w-4 h-4 ${isLethal ? 'text-red-400' : 'text-gray-400'}`}
          aria-hidden="true"
        >
          <path d="M12 2C7.03 2 3 6.03 3 11c0 3.19 1.66 5.99 4.16 7.59.02.74.06 1.49.14 2.21.08.72.71 1.2 1.43 1.2h6.54c.72 0 1.35-.48 1.43-1.2.08-.72.12-1.47.14-2.21C19.34 16.99 21 14.19 21 11c0-4.97-4.03-9-9-9zm-2.5 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
        <span>Veneno</span>
      </span>

      {/* Counter display and buttons */}
      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <button
          type="button"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-green-400 font-bold text-lg select-none touch-none transition-colors"
          aria-label="Decrementar veneno"
          {...decrementHandlers}
        >
          −
        </button>

        {/* Poison value */}
        <span
          className={`min-w-[40px] text-center font-bold text-2xl tabular-nums ${
            isLethal ? 'text-red-400' : 'text-green-400'
          }`}
        >
          {poison}
        </span>

        {/* Increment button */}
        <button
          type="button"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-green-400 font-bold text-lg select-none touch-none transition-colors"
          aria-label="Incrementar veneno"
          {...incrementHandlers}
        >
          +
        </button>
      </div>
    </div>
  )
}
