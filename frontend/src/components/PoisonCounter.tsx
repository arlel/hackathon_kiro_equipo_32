import { useLongPress } from '@/hooks/useLongPress'
import { useTranslation } from '@/i18n/I18nContext'

interface PoisonCounterProps {
  poison: number
  onAdjust: (amount: number) => void
}

export default function PoisonCounter({ poison, onAdjust }: PoisonCounterProps) {
  const { t } = useTranslation()
  const isLethal = poison >= 10

  // Tap = +1, Long press = -1
  const handlers = useLongPress({
    onShortPress: () => onAdjust(1),
    onLongPress: () => onAdjust(-1),
    threshold: 500,
  })

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Poison count badge (shown above when > 0) */}
      {poison > 0 && (
        <span
          className={`absolute -top-2 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full text-xs font-bold px-1 ${
            isLethal
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-green-700 text-white'
          }`}
        >
          {poison}
        </span>
      )}

      {/* Poison icon button — tap +1, hold -1 */}
      <button
        type="button"
        className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 transition-all select-none touch-none ${
          isLethal
            ? 'border-red-500 bg-red-950/80 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
            : poison > 0
              ? 'border-green-600 bg-green-950/60'
              : 'border-gray-600 bg-gray-800/60 hover:border-green-600'
        }`}
        aria-label={t('poisonCounter.aria', { count: poison })}
        title={t('poisonCounter.title', { count: poison })}
        {...handlers}
      >
        {/* Phyrexian/poison symbol */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`w-6 h-6 ${
            isLethal ? 'text-red-400' : poison > 0 ? 'text-green-400' : 'text-gray-500'
          }`}
        >
          <path d="M12 2C7.03 2 3 6.03 3 11c0 3.19 1.66 5.99 4.16 7.59.02.74.06 1.49.14 2.21.08.72.71 1.2 1.43 1.2h6.54c.72 0 1.35-.48 1.43-1.2.08-.72.12-1.47.14-2.21C19.34 16.99 21 14.19 21 11c0-4.97-4.03-9-9-9zm-2.5 13a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm5 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      </button>
    </div>
  )
}
