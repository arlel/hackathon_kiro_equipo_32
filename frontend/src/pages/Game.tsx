import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import type { Player, GameFormat } from '@/types/game'
import CommanderSearch from '@/components/CommanderSearch'
import type { ScryfallCard } from '@/services/scryfall'
import { getCardImageUrl } from '@/services/scryfall'

const FORMAT_LIFE: Record<GameFormat, number> = {
  commander: 40,
  standard: 20,
  modern: 20,
  pauper: 20,
  custom: 20,
}

const PLAYER_COLORS = [
  'bg-purple-900', 'bg-blue-900', 'bg-green-900', 'bg-red-900',
  'bg-yellow-900', 'bg-pink-900', 'bg-indigo-900', 'bg-teal-900',
]

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [searchParams] = useSearchParams()
  const format = (searchParams.get('format') as GameFormat) || 'commander'
  const isCreator = searchParams.get('create') === 'true'

  const startingLife = FORMAT_LIFE[format]
  const [players, setPlayers] = useState<Player[]>([])
  const [myId] = useState(() => crypto.randomUUID())
  const [myName, setMyName] = useState('')
  const [commanderName, setCommanderName] = useState('')
  const [commanderImage, setCommanderImage] = useState('')
  const [joined, setJoined] = useState(false)
  const [showCommanderDamage, setShowCommanderDamage] = useState<string | null>(null)
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!joined) return

    // Connect directly to backend for WebSocket (proxy issues with Vite)
    const wsHost = window.location.hostname
    const wsPort = '8000'
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}/game-ws/${roomCode}?player_id=${myId}&player_name=${encodeURIComponent(myName)}&commander_name=${encodeURIComponent(commanderName)}&commander_image=${encodeURIComponent(commanderImage)}&format=${format}`
    
    ws.current = new WebSocket(wsUrl)

    ws.current.onopen = () => {
      console.log('WebSocket connected to', wsUrl)
      setWsStatus('connected')
    }

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'state_update') {
        setPlayers(data.players)
      }
    }

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      setWsStatus('error')
    }

    ws.current.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason)
    }

    return () => {
      ws.current?.close()
    }
  }, [joined, roomCode, myId, myName, commanderName, commanderImage, format])

  const sendAction = (action: string, payload: Record<string, unknown>) => {
    ws.current?.send(JSON.stringify({ action, ...payload }))
  }

  const adjustLife = (playerId: string, amount: number) => {
    sendAction('adjust_life', { targetId: playerId, amount })
  }

  const adjustCommanderDamage = (fromId: string, toId: string, amount: number) => {
    sendAction('commander_damage', { fromId, toId, amount })
  }

  if (!joined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl p-6 w-full max-w-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Unirse a sala: {roomCode}</h2>
            <button onClick={() => navigate('/')} className="text-sm text-gray-400 hover:text-white">
              ← Volver
            </button>
          </div>
          <p className="text-sm text-gray-400">Formato: {format} ({startingLife} vida)</p>
          
          <input
            type="text"
            placeholder="Tu nombre"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
          />

          {format === 'commander' && (
            <CommanderSearch
              value={commanderName}
              onChange={(name, card?: ScryfallCard) => {
                setCommanderName(name)
                if (card) {
                  const artUrl = getCardImageUrl(card, 'art_crop')
                  setCommanderImage(artUrl || '')
                }
              }}
              placeholder="Buscar tu Commander..."
            />
          )}

          <button
            onClick={() => setJoined(true)}
            disabled={!myName.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {isCreator ? 'Crear y Unirse' : 'Unirse'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="text-sm text-gray-400">
          Sala: <span className="text-purple-400 font-mono font-bold">{roomCode}</span>
          <span className={`ml-2 inline-block w-2 h-2 rounded-full ${
            wsStatus === 'connected' ? 'bg-green-400' : wsStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
          }`}></span>
        </div>
        <div className="text-sm text-gray-400">
          {players.length} jugadores • {format}
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {players.map((player, idx) => (
          <div
            key={player.id}
            className={`rounded-xl p-4 relative overflow-hidden min-h-[160px] ${
              player.id === myId ? 'ring-2 ring-purple-400' : ''
            } ${!player.commanderImage ? PLAYER_COLORS[idx % PLAYER_COLORS.length] : ''}`}
          >
            {/* Commander art background */}
            {player.commanderImage && (
              <div className="absolute inset-0">
                <img
                  src={player.commanderImage}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60" />
              </div>
            )}

            {/* Content (on top of background) */}
            <div className="relative z-10">
              {/* Player Info */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold drop-shadow-lg">{player.username}</span>
                  {player.commanderName && (
                    <span className="text-xs text-gray-200 ml-2 drop-shadow-lg">
                      ({player.commanderName})
                    </span>
                  )}
                </div>
                {!player.isConnected && (
                  <span className="text-xs text-red-400 bg-black/50 px-1 rounded">desconectado</span>
                )}
              </div>

              {/* Life Counter */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => adjustLife(player.id, -1)}
                  className="w-12 h-12 bg-black/40 hover:bg-red-800/60 rounded-full text-2xl font-bold transition-colors backdrop-blur-sm"
                >
                  -
                </button>
                <span className="text-5xl font-bold min-w-[3ch] text-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {player.life}
                </span>
                <button
                  onClick={() => adjustLife(player.id, 1)}
                  className="w-12 h-12 bg-black/40 hover:bg-green-800/60 rounded-full text-2xl font-bold transition-colors backdrop-blur-sm"
                >
                  +
                </button>
              </div>

              {/* Commander Damage Toggle */}
              {format === 'commander' && (
                <button
                  onClick={() => setShowCommanderDamage(
                    showCommanderDamage === player.id ? null : player.id
                  )}
                  className="mt-2 text-xs text-gray-200 hover:text-white transition-colors w-full text-center drop-shadow-lg"
                >
                  ⚔️ Commander Damage
                </button>
              )}

              {/* Commander Damage Panel */}
              {showCommanderDamage === player.id && format === 'commander' && (
                <div className="mt-2 space-y-1 bg-black/50 backdrop-blur-sm rounded-lg p-2">
                  {players
                    .filter((p) => p.id !== player.id)
                    .map((source) => (
                      <div key={source.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-200 truncate flex-1">
                          {source.commanderName || source.username}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => adjustCommanderDamage(source.id, player.id, -1)}
                            className="w-6 h-6 bg-black/40 rounded text-xs hover:bg-red-800/60"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono">
                            {player.commanderDamage[source.id] || 0}
                          </span>
                          <button
                            onClick={() => adjustCommanderDamage(source.id, player.id, 1)}
                            className="w-6 h-6 bg-black/40 rounded text-xs hover:bg-green-800/60"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
