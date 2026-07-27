import type { ReactNode } from 'react'
import type { Player } from '@/types/game'
import ArtPicker from '@/components/ArtPicker'

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
  onArtChange?: (artUrl: string) => void
  /** Slot for the poison counter — rendered on the left side */
  poisonSlot?: ReactNode
}

export default function PlayerCard({ player, isLocal, colorIndex, children, onArtChange, poisonSlot }: PlayerCardProps) {
  const hasCommanderImage = Boolean(player.commanderImage)
  const bgColorClass = POSITION_COLORS[colorIndex % POSITION_COLORS.length]
  const isEliminated = Boolean(player.eliminationCause)

  return (
    <div
      className={`rounded-xl relative min-h-[120px] ${
        isLocal ? 'ring-2 ring-purple-500' : ''
      } ${!hasCommanderImage ? bgColorClass : 'bg-gray-900'} ${
        isEliminated ? 'grayscale opacity-50' : ''
      }`}
    >
      {/* Commander art background with dark overlay */}
      {hasCommanderImage && (
        <div className="absolute inset-0 overflow-hidden rounded-xl">
          <img
            src={player.commanderImage}
            alt=""
            className={`w-full h-full object-cover ${isEliminated ? 'grayscale' : ''}`}
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className={`absolute inset-0 ${isEliminated ? 'bg-black/80' : 'bg-black/55'}`} />
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10 p-3">
        {/* Player header — bigger name */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-bold text-white text-lg truncate drop-shadow-lg">
              {player.username}
            </span>
            {player.commanderName && (
              <span className="text-sm text-gray-200 truncate drop-shadow-lg">
                ({player.commanderName})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Art picker */}
            {player.commanderName && onArtChange && (
              <ArtPicker
                commanderName={player.commanderName}
                currentArt={player.commanderImage}
                onSelect={onArtChange}
              />
            )}
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

        {/* Main content area — poison on left, counters in center */}
        <div className="flex items-center">
          {/* Poison slot (left side, absolute so it doesn't push content) */}
          {poisonSlot && (
            <div className="flex-shrink-0 mr-2">
              {poisonSlot}
            </div>
          )}

          {/* Main children (life counter, cmd damage, etc.) — always centered */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
