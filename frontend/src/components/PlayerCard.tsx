import type { ReactNode } from 'react'
import type { Player } from '@/types/game'

const POSITION_COLORS = [
  'bg-purple-900',
  'bg-blue-900',
  'bg-green-900',
  'bg-red-900',
  'bg-yellow-900',
  'bg-pink-900',
  'bg-indigo-900',
  'bg-teal-900',
  'bg-orange-900',
  'bg-cyan-900',
  'bg-fuchsia-900',
  'bg-lime-900',
] as const

interface PlayerCardProps {
  player: Player
  isLocal: boolean
  colorIndex: number
  children?: ReactNode
}

export default function PlayerCard({ player, isLocal, colorIndex, children }: PlayerCardProps) {
  const hasCommanderImage = Boolean(player.commanderImage)
  const bgColorClass = POSITION_COLORS[colorIndex % POSITION_COLORS.length]
  const isEliminated = Boolean(player.eliminationCause)

  return (
    <div
      className={`rounded-xl relative overflow-hidden min-h-[160px] ${
        isLocal ? 'ring-2 ring-purple-500' : ''
      } ${!hasCommanderImage ? bgColorClass : 'bg-gray-900'} ${
        isEliminated ? 'opacity-60' : ''
      }`}
    >
      {/* Commander art background with 60% dark overlay */}
      {hasCommanderImage && (
        <div className="absolute inset-0">
          <img
            src={player.commanderImage}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken image, fallback to position color
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10 p-4">
        {/* Player header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-white truncate drop-shadow-lg">
              {player.username}
            </span>
            {player.commanderName && (
              <span className="text-xs text-gray-200 truncate drop-shadow-lg">
                ({player.commanderName})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Disconnected indicator */}
            {!player.isConnected && (
              <span className="text-xs text-red-400 bg-black/50 px-2 py-0.5 rounded font-medium">
                desconectado
              </span>
            )}
          </div>
        </div>

        {/* Elimination indicator */}
        {isEliminated && (
          <div className="mb-2 flex items-center gap-1 bg-red-900/60 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-sm">💀</span>
            <span className="text-xs text-red-200 font-medium">
              Eliminado — {player.eliminationCause}
              {player.eliminationOrder != null && ` (#${player.eliminationOrder})`}
            </span>
          </div>
        )}

        {/* Children: LifeCounter, PoisonCounter, CmdDamagePanel, etc. */}
        {children}
      </div>
    </div>
  )
}
