import { useState, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import type { Player, GameFormat } from '@/types/game'
import type { StateUpdate, StarterSelected, GameEnded } from '@/hooks/useWebSocket'
import { useWebSocket } from '@/hooks/useWebSocket'
import CommanderSearch from '@/components/CommanderSearch'
import DeckSelector from '@/components/DeckSelector'
import PlayerCard from '@/components/PlayerCard'
import LifeCounter from '@/components/LifeCounter'
import PoisonCounter from '@/components/PoisonCounter'
import CmdDamagePanel from '@/components/CmdDamagePanel'
import StarterPicker from '@/components/StarterPicker'
import RoomSettings from '@/components/RoomSettings'
import DisplaySettings, { type DisplayMode } from '@/components/DisplaySettings'
import type { ScryfallCard } from '@/services/scryfall'
import { getCardImageUrl } from '@/services/scryfall'

// ═══════════════════════════════════════════════════════
// Join form data passed to GameView after joining
// ═══════════════════════════════════════════════════════
interface JoinData {
  playerId: string
  playerName: string
  commanderName: string
  commanderImage: string
  partnerName: string
  partnerImage: string
  deckId: string
}

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Room config from URL params
  const format = (searchParams.get('format') as GameFormat) || 'commander'
  const isCreator = searchParams.get('create') === 'true'
  const startingLife = Number(searchParams.get('startingLife')) || (format === 'commander' ? 40 : 20)
  const poisonEnabled = searchParams.get('poisonEnabled') === 'true'
  const turnCounterEnabled = searchParams.get('turnCounterEnabled') === 'true'

  // Join form state
  const [joinData, setJoinData] = useState<JoinData | null>(null)
  const [myId] = useState(() => crypto.randomUUID())
  const [myName, setMyName] = useState('')
  const [commanderName, setCommanderName] = useState('')
  const [commanderImage, setCommanderImage] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [partnerImage, setPartnerImage] = useState('')
  const [deckId, setDeckId] = useState('')

  // Commander search handler for join form
  const handleCommanderSelect = (
    commander: { name: string; image: string },
    partner?: { name: string; image: string }
  ) => {
    setCommanderName(commander.name)
    setCommanderImage(commander.image)
    if (partner) {
      setPartnerName(partner.name)
      setPartnerImage(partner.image)
    } else {
      setPartnerName('')
      setPartnerImage('')
    }
  }

  // Deck selector handler
  const handleDeckSelect = (deck: {
    id: string
    commanderName?: string
    commanderImage?: string
    partnerName?: string
    partnerImage?: string
  }) => {
    setDeckId(deck.id)
    if (deck.commanderName) {
      setCommanderName(deck.commanderName)
      setCommanderImage(deck.commanderImage || '')
      setPartnerName(deck.partnerName || '')
      setPartnerImage(deck.partnerImage || '')
    }
  }

  const handleJoin = () => {
    setJoinData({
      playerId: myId,
      playerName: myName,
      commanderName,
      commanderImage,
      partnerName,
      partnerImage,
      deckId,
    })
  }

  // ═══════════════════════════════════════════════════════
  // POST-JOIN: Render GameView with WebSocket connection
  // ═══════════════════════════════════════════════════════
  if (joinData) {
    return (
      <GameView
        roomCode={roomCode || ''}
        format={format}
        startingLife={startingLife}
        poisonEnabled={poisonEnabled}
        turnCounterEnabled={turnCounterEnabled}
        joinData={joinData}
      />
    )
  }

  // ═══════════════════════════════════════════════════════
  // JOIN FORM (pre-game)
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950 text-white">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Unirse a sala: <span className="text-purple-400 font-mono">{roomCode}</span>
          </h2>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Volver
          </button>
        </div>

        <p className="text-sm text-gray-400">
          Formato: {format} • {startingLife} vida
          {poisonEnabled && ' • Veneno'}
          {turnCounterEnabled && ' • Turnos'}
        </p>

        {/* Player Name */}
        <input
          type="text"
          placeholder="Tu nombre"
          value={myName}
          onChange={(e) => setMyName(e.target.value.slice(0, 30))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {/* Commander Search (for commander format) */}
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
            onSelect={handleCommanderSelect}
            placeholder="Buscar tu Commander..."
          />
        )}

        {/* Deck Selector */}
        <DeckSelector format={format} onSelect={handleDeckSelect} />

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={!myName.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {isCreator ? 'Crear y Unirse' : 'Unirse'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Game View Component (active game with WebSocket)
// ═══════════════════════════════════════════════════════

interface GameViewProps {
  roomCode: string
  format: GameFormat
  startingLife: number
  poisonEnabled: boolean
  turnCounterEnabled: boolean
  joinData: JoinData
}

function GameView({ roomCode, format, startingLife, poisonEnabled: initialPoisonEnabled, turnCounterEnabled: initialTurnCounterEnabled, joinData }: GameViewProps) {
  const navigate = useNavigate()

  // Game state
  const [players, setPlayers] = useState<Player[]>([])
  const [turnCount, setTurnCount] = useState(0)
  const [showCmdDamage, setShowCmdDamage] = useState<string | null>(null)
  const [starterSelectedId, setStarterSelectedId] = useState<string | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameEnded, setGameEnded] = useState<{ winnerId: string | null; winnerName: string | null } | null>(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [localArtOverride, setLocalArtOverride] = useState<string | null>(null)
  // Room config from server (overrides URL params once we get the first state_update)
  const [poisonEnabled, setPoisonEnabled] = useState(initialPoisonEnabled)
  const [turnCounterEnabled, setTurnCounterEnabled] = useState(initialTurnCounterEnabled)
  const [roomFormat, setRoomFormat] = useState(format)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all')

  // WebSocket callbacks
  const handleStateUpdate = useCallback((state: StateUpdate) => {
    setPlayers(state.players)
    setTurnCount(state.turnCount)
    // Update room config from server (authoritative source)
    if (state.config) {
      setPoisonEnabled(state.config.poisonEnabled)
      setTurnCounterEnabled(state.config.turnCounterEnabled)
    }
    if (state.format) {
      setRoomFormat(state.format as typeof format)
    }
  }, [])

  const handleStarterSelected = useCallback((data: StarterSelected) => {
    setStarterSelectedId(data.playerId)
  }, [])

  const handleGameEnded = useCallback((data: GameEnded) => {
    setGameEnded({ winnerId: data.winnerId, winnerName: data.winnerName })
  }, [])

  const handleError = useCallback((message: string) => {
    console.error('WebSocket error:', message)
  }, [])

  // Connect WebSocket
  const { status, sendAction, disconnect } = useWebSocket({
    roomCode,
    playerId: joinData.playerId,
    playerName: joinData.playerName,
    commanderName: joinData.commanderName,
    commanderImage: joinData.commanderImage,
    partnerName: joinData.partnerName,
    partnerImage: joinData.partnerImage,
    format,
    poisonEnabled,
    turnCounterEnabled,
    startingLife,
    deckId: joinData.deckId,
    onStateUpdate: handleStateUpdate,
    onStarterSelected: handleStarterSelected,
    onGameEnded: handleGameEnded,
    onError: handleError,
  })

  // Derived state
  const activePlayers = useMemo(() => players.filter((p) => !p.eliminationCause), [players])
  const lastPlayerStanding = useMemo(() => {
    if (players.length < 2) return null
    if (activePlayers.length === 1) return activePlayers[0]
    return null
  }, [players, activePlayers])

  // Actions
  const adjustLife = useCallback((playerId: string, amount: number) => {
    if (!gameStarted) setGameStarted(true)
    sendAction({ action: 'adjust_life', targetId: playerId, amount })
  }, [sendAction, gameStarted])

  const adjustPoison = useCallback((playerId: string, amount: number) => {
    if (!gameStarted) setGameStarted(true)
    sendAction({ action: 'adjust_poison', targetId: playerId, amount })
  }, [sendAction, gameStarted])

  const adjustCommanderDamage = useCallback((commanderSourceId: string, toId: string, amount: number) => {
    if (!gameStarted) setGameStarted(true)
    sendAction({ action: 'commander_damage', commanderSourceId, toId, amount })
  }, [sendAction, gameStarted])

  const incrementTurn = useCallback(() => {
    sendAction({ action: 'increment_turn' })
  }, [sendAction])

  const selectStarter = useCallback(() => {
    sendAction({ action: 'select_starter' })
  }, [sendAction])

  const endGame = useCallback(() => {
    const winnerId = lastPlayerStanding?.id || null
    sendAction({ action: 'end_game', winnerId })
  }, [sendAction, lastPlayerStanding])

  const restartGame = useCallback(() => {
    setGameEnded(null)
    setStarterSelectedId(null)
    sendAction({ action: 'restart_game' })
  }, [sendAction])

  const handleLeave = useCallback(() => {
    disconnect()
    navigate('/')
  }, [disconnect, navigate])

  // Build commander damage sources for a player
  const getCmdDamageSources = (player: Player) => {
    const sources: { id: string; name: string; playerName?: string; image?: string; damage: number; isPartner?: boolean }[] = []
    for (const other of players) {
      if (other.id === player.id) continue
      // Main commander
      const mainDamage = player.commanderDamage[other.id] || 0
      sources.push({
        id: other.id,
        name: other.commanderName || other.username,
        playerName: other.commanderName ? other.username : undefined,
        image: other.commanderImage,
        damage: mainDamage,
      })
      // Partner (if exists)
      if (other.partnerName) {
        const partnerId = `${other.id}_partner`
        const partnerDamage = player.commanderDamage[partnerId] || 0
        sources.push({
          id: partnerId,
          name: other.partnerName,
          playerName: other.username,
          image: other.partnerImage,
          damage: partnerDamage,
          isPartner: true,
        })
      }
    }
    return sources
  }

  // Connection status indicator color
  const statusColor = status === 'connected'
    ? 'bg-green-400'
    : status === 'error' || status === 'disconnected'
      ? 'bg-red-400'
      : 'bg-yellow-400 animate-pulse'

  return (
    <div className="min-h-screen p-2 bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>
            Sala: <span className="text-purple-400 font-mono font-bold">{roomCode}</span>
          </span>
          <span className={`inline-block w-2 h-2 rounded-full ${statusColor}`} title={status}></span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {turnCounterEnabled && (
            <button
              onClick={incrementTurn}
              className="flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-800/70 border border-amber-600 text-amber-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
              title="Incrementar turno"
            >
              <span>🔄</span>
              <span className="text-sm">Turno:</span>
              <span className="font-mono text-base font-bold">{turnCount}</span>
            </button>
          )}
          <span>{players.length}P • {roomFormat}</span>
          <DisplaySettings mode={displayMode} onChange={setDisplayMode} />
          <RoomSettings
            poisonEnabled={poisonEnabled}
            turnCounterEnabled={turnCounterEnabled}
            onTogglePoison={(enabled) => {
              setPoisonEnabled(enabled)
              sendAction({ action: 'toggle_poison', enabled })
            }}
            onToggleTurnCounter={(enabled) => {
              setTurnCounterEnabled(enabled)
              sendAction({ action: 'toggle_turn_counter', enabled })
            }}
          />
        </div>
      </div>

      {/* Last player standing — confirmation dialog */}
      {lastPlayerStanding && !gameEnded && !showEndConfirm && (
        <div className="mx-2 mb-3 bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 flex items-center justify-between">
          <span className="text-yellow-200 text-sm font-medium">
            🏆 ¡{lastPlayerStanding.username} es el último jugador en pie!
          </span>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-semibold text-sm px-3 py-1 rounded-lg transition-colors"
          >
            Finalizar Partida
          </button>
        </div>
      )}

      {/* End game confirmation modal */}
      {showEndConfirm && !gameEnded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4 text-center shadow-2xl">
            <p className="text-3xl">🏆</p>
            <h3 className="text-xl font-bold text-white">
              ¿Finalizar la partida?
            </h3>
            {lastPlayerStanding && (
              <p className="text-yellow-300 text-sm">
                {lastPlayerStanding.username} es el último jugador en pie
              </p>
            )}
            <p className="text-gray-400 text-sm">
              Se guardará el resultado y la sala se cerrará para todos los jugadores.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowEndConfirm(false)
                  endGame()
                }}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-semibold py-3 rounded-lg transition-colors"
              >
                Sí, finalizar
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Continuar jugando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game ended overlay */}
      {gameEnded && (
        <div className="mx-2 mb-3 bg-purple-900/50 border border-purple-600 rounded-lg p-4 text-center space-y-3">
          <p className="text-xl font-bold text-purple-200">
            🎉 ¡Partida Finalizada!
          </p>
          {gameEnded.winnerName && (
            <p className="text-lg text-yellow-300">
              Ganador: {gameEnded.winnerName}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={restartGame}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Reiniciar Partida
            </button>
            <button
              onClick={handleLeave}
              className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              🚪 Salir
            </button>
          </div>
        </div>
      )}

      {/* Starter Picker — only show before game starts */}
      {!gameEnded && !gameStarted && (
        <StarterPicker
          players={players.map((p) => ({ id: p.id, username: p.username }))}
          selectedId={starterSelectedId}
          onSelect={selectStarter}
        />
      )}

      {/* Players Grid - 1 col < 640px, 2 cols >= 640px */}
      <div className={`grid gap-2 mt-2 ${displayMode === 'self' ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {players
          .filter((player) => {
            if (displayMode === 'self') return player.id === joinData.playerId
            return true
          })
          .map((player, idx) => {
          const isLocalPlayer = player.id === joinData.playerId
          // Apply local art override for the local player
          const displayPlayer = isLocalPlayer && localArtOverride
            ? { ...player, commanderImage: localArtOverride }
            : player

          // Compact mode: show simple row for non-local players
          if (displayMode === 'compact' && !isLocalPlayer) {
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  player.eliminationCause ? 'bg-gray-800/50 opacity-50 grayscale' : 'bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium">{player.username}</span>
                  {player.commanderName && (
                    <span className="text-xs text-gray-400">({player.commanderName})</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {poisonEnabled && player.poisonCounters > 0 && (
                    <span className="text-xs text-green-400">☠️ {player.poisonCounters}</span>
                  )}
                  <span className={`font-bold text-lg tabular-nums ${player.life <= 0 ? 'text-red-400' : 'text-white'}`}>
                    {player.life}
                  </span>
                </div>
              </div>
            )
          }

          return (
          <PlayerCard
            key={player.id}
            player={displayPlayer}
            isLocal={isLocalPlayer}
            colorIndex={idx}
            onArtChange={isLocalPlayer ? (artUrl) => setLocalArtOverride(artUrl) : undefined}
            poisonSlot={
              poisonEnabled ? (
                <PoisonCounter
                  poison={player.poisonCounters}
                  onAdjust={(amount) => adjustPoison(player.id, amount)}
                />
              ) : undefined
            }
          >
            {/* Life Counter */}
            <div className="flex justify-center">
              <LifeCounter
                life={player.life}
                onAdjust={(amount) => adjustLife(player.id, amount)}
              />
            </div>

            {/* Commander Damage Toggle */}
            {roomFormat === 'commander' && (
              <>
                <button
                  onClick={() => setShowCmdDamage(showCmdDamage === player.id ? null : player.id)}
                  className="mt-2 text-xs text-gray-200 hover:text-white transition-colors w-full text-center drop-shadow-lg"
                >
                  ⚔️ Commander Damage {showCmdDamage === player.id ? '▲' : '▼'}
                </button>

                {showCmdDamage === player.id && (
                  <div className="mt-2">
                    <CmdDamagePanel
                      sources={getCmdDamageSources(player)}
                      onAdjust={(sourceId, amount) => adjustCommanderDamage(sourceId, player.id, amount)}
                    />
                  </div>
                )}
              </>
            )}
          </PlayerCard>
          )
        })}
      </div>

      {/* Footer actions */}
      {!gameEnded && (
        <div className="flex gap-3 justify-center mt-4 px-2">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🏁 Finalizar Partida
          </button>
          <button
            onClick={restartGame}
            className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🔄 Reiniciar
          </button>
          <button
            onClick={handleLeave}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
          >
            🚪 Salir
          </button>
        </div>
      )}
    </div>
  )
}
