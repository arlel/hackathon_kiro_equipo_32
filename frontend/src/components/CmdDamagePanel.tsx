import { useLongPress } from '@/hooks/useLongPress'
import { useTranslation } from '@/i18n/I18nContext'

interface DamageSource {
  id: string
  name: string
  playerName?: string
  image?: string
  damage: number
  isPartner?: boolean
}

interface CmdDamagePanelProps {
  sources: DamageSource[]
  onAdjust: (sourceId: string, amount: number) => void
}

interface DamageRowProps {
  source: DamageSource
  onAdjust: (sourceId: string, amount: number) => void
}

function DamageRow({ source, onAdjust }: DamageRowProps) {
  const { t } = useTranslation()
  const decrementHandlers = useLongPress({
    onShortPress: () => onAdjust(source.id, -1),
    onLongPress: () => onAdjust(source.id, -10),
  })

  const incrementHandlers = useLongPress({
    onShortPress: () => onAdjust(source.id, 1),
    onLongPress: () => onAdjust(source.id, 10),
  })

  const isLethal = source.damage >= 21

  return (
    <div
      className={`relative flex items-center justify-between rounded-lg px-3 py-2 overflow-hidden ${
        isLethal ? 'border border-red-500' : 'bg-gray-800'
      }`}
    >
      {/* Background art (subtle) */}
      {source.image && (
        <div className="absolute inset-0">
          <img src={source.image} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}
      {!source.image && !isLethal && <div className="absolute inset-0 bg-gray-800" />}
      {!source.image && isLethal && <div className="absolute inset-0 bg-red-900/50" />}

      <div className="relative flex flex-col min-w-0 flex-1">
        <span className="text-sm text-gray-100 truncate font-medium">
          {source.name}
        </span>
        {source.playerName && (
          <span className="text-xs text-gray-400 truncate">{source.playerName}</span>
        )}
        {source.isPartner && (
          <span className="text-xs text-purple-400">{t('cmdDamage.partner')}</span>
        )}
      </div>

      <div className="relative flex items-center gap-2 ml-3">
        <button
          type="button"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-lg select-none touch-manipulation"
          {...decrementHandlers}
        >
          −
        </button>

        <span
          className={`min-w-[36px] text-center font-bold text-lg tabular-nums ${
            isLethal ? 'text-red-400' : 'text-white'
          }`}
        >
          {source.damage}
        </span>

        <button
          type="button"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-lg select-none touch-manipulation"
          {...incrementHandlers}
        >
          +
        </button>
      </div>

      {isLethal && (
        <span className="ml-2 text-red-400 text-xs font-semibold whitespace-nowrap">
          ☠ 21+
        </span>
      )}
    </div>
  )
}

export default function CmdDamagePanel({ sources, onAdjust }: CmdDamagePanelProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2 p-3 bg-gray-900 rounded-xl">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
        {t('cmdDamage.heading')}
      </h3>
      {sources.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-2">
          {t('cmdDamage.noSources')}
        </p>
      ) : (
        sources.map((source) => (
          <DamageRow key={source.id} source={source} onAdjust={onAdjust} />
        ))
      )}
    </div>
  )
}
