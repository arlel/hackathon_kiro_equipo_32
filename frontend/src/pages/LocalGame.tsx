import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLocalRoom } from '@/hooks/useLocalRoom'
import type { GameFormat, RoomConfig, Player } from '@/types/game'
import PlayerCard from '@/components/PlayerCard'
import LifeCounter from '@/components/LifeCounter'
import PoisonCounter from '@/components/PoisonCounter'
import CmdDamagePanel from '@/components/CmdDamagePanel'
import StarterPicker from '@/components/StarterPicker'
import CommanderSearch from '@/components/CommanderSearch'
import DeckSelector from '@/components/DeckSelector'
import type { ScryfallCard } from '@/services/scryfall'
import { getCardImageUrl } from '@/services/scryfall'

type Phase = 'config' | 'players' | 'playing'

const DEFAULT_STARTING_LIFE: Record<GameFormat, number> = {
  commander: 40,
  '20vida': 20,
  custom: 20,
}

export default function LocalGame() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const {
    room,
    createRoom,
    addPlayer,
    removePlayer,
    adjustLife,
    adjustPoison,
    applyCommanderDamage,
    incrementTurn,
    selectRandomStarter,
    checkElimination,
    endGame,
    restartGame,
  } = useLocalRoom()

  const [phase, setPhase] = useState<Phase>('config')

  // Config form state
  const [format, setFormat] = useState<GameFormat>('commander')
  const [poisonEnabled, setPoisonEnabled] = useState(false)
  const [turnEnabled, setTurnEnabled] = useState(false)
  const [customLife, setCustomLife] = useState(20)

  // Add player form state
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newCommanderName, setNewCommanderName] = useState('')
  const [newCommanderImage, setNewCommanderImage] = useState('')
  const [newPartnerName, setNewPartnerName] = useState('')
  const [newPartnerImage, setNewPartnerImage] = useState('')
  const [newDeckId, setNewDeckId] = useState('')

  // Game state
  const [showCmdDamage, setShowCmdDamage] = useState<string | null>(null)
  const [starterId, setStarterId] = useState<string | null>(null)
  const [gameEnded, setGameEnded] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)

  const handleAdjustLife = useCallback(
    (playerId: string, amount: number) => {
      adjustLife(playerId, amount)
      checkElimination(playerId)
    },
    [adjustLife, checkElimination]
  )

  const handleAdjustPoison = useCallback(
    (playerId: string, amount: number) => {
      adjustPoison(playerId, amount)
      checkElimination(playerId)
    },
    [adjustPoison, checkElimination]
  )

  const handleCmdDamage = useCallback(
    (sourceId: string, targetId: string, amount: number) => {
      applyCommanderDamage(sourceId, targetId, amount)
      checkElimination(targetId)
    },
    [applyCommanderDamage, checkElimination]
  )

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
        <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold text-white">Autenticación requerida</h2>
          <p className="text-gray-400 text-sm">
            Necesitas iniciar sesión para crear una sala local.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Ir a Login
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2 rounded-lg transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // Phase 1: Room configuration
  if (phase === 'config') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-950">
        <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Sala Local</h2>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Volver
            </button>
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {(['commander', '20vida', 'custom'] as GameFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    format === f
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {f === 'commander' ? 'Commander (40)' : f === '20vida' ? '20 Vida' : 'Custom'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom life input */}
          {format === 'custom' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Vida inicial</label>
              <input
                type="number"
                min={1}
                value={customLife}
                onChange={(e) => setCustomLife(Math.max(1, Number(e.target.value)))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          )}

          {/* Poison toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">Contadores de veneno</span>
            <input
              type="checkbox"
              checked={poisonEnabled}
              onChange={(e) => setPoisonEnabled(e.target.checked)}
              className="w-5 h-5 accent-purple-500 rounded"
            />
          </label>

          {/* Turn counter toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">Contador de turnos</span>
            <input
              type="checkbox"
              checked={turnEnabled}
              onChange={(e) => setTurnEnabled(e.target.checked)}
              className="w-5 h-5 accent-purple-500 rounded"
            />
          </label>

          {/* Create room button */}
          <button
            onClick={() => {
              const startingLife =
                format === 'custom' ? customLife : DEFAULT_STARTING_LIFE[format]
              const config: RoomConfig = {
                format,
                startingLife,
                poisonEnabled,
                turnCounterEnabled: turnEnabled,
              }
              createRoom(config)
              setPhase('players')
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Crear Sala Local
          </button>
        </div>
      </div>
    )
  }

  // Phase 2: Add/remove players
  if (phase === 'players' && room) {
    const handleAddPlayer = () => {
      if (!newPlayerName.trim()) return
      addPlayer(newPlayerName.trim(), {
        commanderName: newCommanderName || undefined,
        commanderImage: newCommanderImage || undefined,
        partnerName: newPartnerName || undefined,
        partnerImage: newPartnerImage || undefined,
        deckId: newDeckId || undefined,
      })
      setNewPlayerName('')
      setNewCommanderName('')
      setNewCommanderImage('')
      setNewPartnerName('')
      setNewPartnerImage('')
      setNewDeckId('')
    }

    return (
      <div className="min-h-screen flex flex-col items-center p-4 bg-gray-950">
        <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Agregar Jugadores</h2>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded font-mono">
              {room.code}
            </span>
          </div>

          <p className="text-sm text-gray-400">
            Formato: {room.config.format} • Vida: {room.config.startingLife}
          </p>

          {/* Current players list */}
          {room.players.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">
                Jugadores ({room.players.length}/12)
              </h3>
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white text-sm truncate">{p.username}</span>
                    {p.commanderName && (
                      <span className="text-xs text-gray-400 truncate">
                        ({p.commanderName})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePlayer(p.id)}
                    className="text-red-400 hover:text-red-300 text-sm flex-shrink-0 ml-2"
                    aria-label={`Eliminar ${p.username}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add player form */}
          {room.players.length < 12 && (
            <div className="space-y-3 border-t border-gray-800 pt-4">
              <input
                type="text"
                placeholder="Nombre del jugador"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                maxLength={30}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              />

              {/* Commander search (only for commander format) */}
              {room.config.format === 'commander' && (
                <CommanderSearch
                  value={newCommanderName}
                  onChange={(name, card?: ScryfallCard) => {
                    setNewCommanderName(name)
                    if (card) {
                      const artUrl = getCardImageUrl(card, 'art_crop')
                      setNewCommanderImage(artUrl || '')
                    } else {
                      setNewCommanderImage('')
                    }
                  }}
                  onSelect={(commander, partner) => {
                    setNewCommanderName(commander.name)
                    setNewCommanderImage(commander.image)
                    if (partner) {
                      setNewPartnerName(partner.name)
                      setNewPartnerImage(partner.image)
                    } else {
                      setNewPartnerName('')
                      setNewPartnerImage('')
                    }
                  }}
                  placeholder="Buscar Commander..."
                />
              )}

              {/* Deck selector */}
              {isAuthenticated && (
                <DeckSelector
                  format={room.config.format}
                  onSelect={(deck) => {
                    setNewDeckId(deck.id)
                    if (deck.commanderName) {
                      setNewCommanderName(deck.commanderName)
                      setNewCommanderImage(deck.commanderImage || '')
                      setNewPartnerName(deck.partnerName || '')
                      setNewPartnerImage(deck.partnerImage || '')
                    }
                  }}
                />
              )}

              <button
                type="button"
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Agregar Jugador
              </button>
            </div>
          )}

          {/* Start game button */}
          <button
            type="button"
            onClick={() => setPhase('playing')}
            disabled={room.players.length < 2}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Iniciar Partida ({room.players.length} jugadores)
          </button>
        </div>
      </div>
    )
  }

  // Phase 3: Game board
  if (phase === 'playing' && room) {
    const activePlayers = room.players.filter((p) => !p.eliminationCause)

    const handleSelectStarter = () => {
      const id = selectRandomStarter()
      setStarterId(id)
    }

    const handleEndGame = () => {
      // Pick the last active player as winner, or null
      const winner = activePlayers.length === 1 ? activePlayers[0].id : null
      endGame(winner)
      setGameEnded(true)
    }

    const handleRestart = () => {
      restartGame()
      setGameEnded(false)
      setStarterId(null)
      setShowCmdDamage(null)
    }



    const buildDamageSources = (player: Player): { id: string; name: string; damage: number; isPartner?: boolean }[] => {
      const sources: { id: string; name: string; damage: number; isPartner?: boolean }[] = []
      for (const other of room.players) {
        if (other.id === player.id) continue
        // Main commander
        const mainId = other.id
        sources.push({
          id: mainId,
          name: other.commanderName || other.username,
          damage: player.commanderDamage[mainId] || 0,
        })
        // Partner (if any)
        if (other.partnerName) {
          const partnerId = `${other.id}_partner`
          sources.push({
            id: partnerId,
            name: other.partnerName,
            damage: player.commanderDamage[partnerId] || 0,
            isPartner: true,
          })
        }
      }
      return sources
    }

    return (
      <div className="min-h-screen p-2 bg-gray-950">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="text-sm text-gray-400">
            Sala Local:{' '}
            <span className="text-purple-400 font-mono font-bold">{room.code}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            {room.config.turnCounterEnabled && (
              <button
                type="button"
                onClick={incrementTurn}
                className="flex items-center gap-1 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300 transition-colors"
              >
                🔄 Turno: {room.turnCount}
              </button>
            )}
            <span>
              {room.players.length} jugadores • {room.config.format}
            </span>
          </div>
        </div>

        {/* Starter Picker */}
        {!gameEnded && (
          <StarterPicker
            players={activePlayers.map((p) => ({ id: p.id, username: p.username }))}
            selectedId={starterId}
            onSelect={handleSelectStarter}
          />
        )}

        {/* Last player standing notification */}
        {activePlayers.length === 1 && room.players.length >= 2 && !gameEnded && !showEndConfirm && (
          <div className="mx-2 mb-3 bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 flex items-center justify-between">
            <span className="text-yellow-200 text-sm font-medium">
              🏆 ¡{activePlayers[0].username} es el último jugador en pie!
            </span>
            <button
              type="button"
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
              {activePlayers.length === 1 && (
                <p className="text-yellow-300 text-sm">
                  {activePlayers[0].username} es el último jugador en pie
                </p>
              )}
              <p className="text-gray-400 text-sm">
                Se guardará el resultado de la partida.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEndConfirm(false)
                    handleEndGame()
                  }}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-semibold py-3 rounded-lg transition-colors"
                >
                  Sí, finalizar
                </button>
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  Continuar jugando
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game ended banner */}
        {gameEnded && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-xl text-center">
            <p className="text-yellow-300 font-semibold text-lg">🏆 Partida Finalizada</p>
            {activePlayers.length === 1 && (
              <p className="text-yellow-200 text-sm mt-1">
                Ganador: {activePlayers[0].username}
              </p>
            )}
          </div>
        )}

        {/* Players Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {room.players.map((player, idx) => (
            <PlayerCard
              key={player.id}
              player={player}
              isLocal={idx === 0}
              colorIndex={idx}
            >
              {/* Life Counter */}
              {!gameEnded && (
                <div className="flex justify-center">
                  <LifeCounter
                    life={player.life}
                    onAdjust={(amount) => handleAdjustLife(player.id, amount)}
                  />
                </div>
              )}

              {/* Poison Counter */}
              {!gameEnded && room.config.poisonEnabled && (
                <div className="mt-2">
                  <PoisonCounter
                    poison={player.poisonCounters}
                    onAdjust={(amount) => handleAdjustPoison(player.id, amount)}
                  />
                </div>
              )}

              {/* Commander Damage toggle */}
              {!gameEnded && room.config.format === 'commander' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setShowCmdDamage(showCmdDamage === player.id ? null : player.id)
                    }
                    className="mt-2 text-xs text-gray-200 hover:text-white transition-colors w-full text-center"
                  >
                    ⚔️ Commander Damage
                  </button>
                  {showCmdDamage === player.id && (
                    <div className="mt-2">
                      <CmdDamagePanel
                        sources={buildDamageSources(player)}
                        onAdjust={(sourceId, amount) =>
                          handleCmdDamage(sourceId, player.id, amount)
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </PlayerCard>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 px-2">
          {!gameEnded && (
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Finalizar Partida
            </button>
          )}
          <button
            type="button"
            onClick={handleRestart}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {gameEnded ? '🔄 Nueva Partida' : '🔄 Reiniciar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors"
          >
            Salir
          </button>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
