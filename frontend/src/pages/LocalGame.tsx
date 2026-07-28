import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n/I18nContext'
import { useLocalRoom } from '@/hooks/useLocalRoom'
import { saveGame } from '@/services/api'
import type { GameFormat, RoomConfig, Player } from '@/types/game'
import PlayerCard from '@/components/PlayerCard'
import LifeCounter from '@/components/LifeCounter'
import PoisonCounter from '@/components/PoisonCounter'
import CmdDamagePanel from '@/components/CmdDamagePanel'
import StarterPicker from '@/components/StarterPicker'
import CommanderSearch from '@/components/CommanderSearch'
import DeckSelector from '@/components/DeckSelector'
import RoomSettings from '@/components/RoomSettings'
import type { ScryfallCard } from '@/services/scryfall'
import { getCardImageUrl, searchCommanders } from '@/services/scryfall'

type Phase = 'config' | 'players' | 'playing'

const DEFAULT_STARTING_LIFE: Record<GameFormat, number> = {
  commander: 40,
  '20vida': 20,
  custom: 20,
}

export default function LocalGame() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, user } = useAuth()
  const { t } = useTranslation()
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
    togglePoison,
    toggleTurnCounter,
    updatePlayerArt,
    updatePlayerCommander,
  } = useLocalRoom()

  const [phase, setPhase] = useState<Phase>('config')

  // Config form state — initialize from URL params if provided
  const [format, setFormat] = useState<GameFormat>(
    (searchParams.get('format') as GameFormat) || 'commander'
  )
  const [poisonEnabled, setPoisonEnabled] = useState(
    searchParams.get('poisonEnabled') === 'true'
  )
  const [turnEnabled, setTurnEnabled] = useState(
    searchParams.get('turnCounterEnabled') === 'true'
  )
  const [customLife, setCustomLife] = useState(
    Number(searchParams.get('startingLife')) || 20
  )

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
  const [gameStarted, setGameStarted] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false)

  const handleAdjustLife = useCallback(
    (playerId: string, amount: number) => {
      if (!gameStarted) setGameStarted(true)
      adjustLife(playerId, amount)
      checkElimination(playerId)
    },
    [adjustLife, checkElimination, gameStarted]
  )

  const handleAdjustPoison = useCallback(
    (playerId: string, amount: number) => {
      if (!gameStarted) setGameStarted(true)
      adjustPoison(playerId, amount)
      checkElimination(playerId)
    },
    [adjustPoison, checkElimination, gameStarted]
  )

  const handleCmdDamage = useCallback(
    (sourceId: string, targetId: string, amount: number) => {
      if (!gameStarted) setGameStarted(true)
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
          <h2 className="text-xl font-semibold text-white">{t('local.authRequired')}</h2>
          <p className="text-gray-400 text-sm">
            {t('local.authRequiredNote')}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {t('local.goToLogin')}
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2 rounded-lg transition-colors"
          >
            {t('local.backToHome')}
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
            <h2 className="text-xl font-semibold text-white">{t('local.title')}</h2>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← {t('common.back')}
            </button>
          </div>

          {/* Format selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">{t('local.format')}</label>
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
                  {f === 'commander' ? t('local.formatCommander') : t(`format.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom life input */}
          {format === 'custom' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">{t('local.startingLife')}</label>
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
            <span className="text-sm text-gray-300">{t('local.poisonCounters')}</span>
            <input
              type="checkbox"
              checked={poisonEnabled}
              onChange={(e) => setPoisonEnabled(e.target.checked)}
              className="w-5 h-5 accent-purple-500 rounded"
            />
          </label>

          {/* Turn counter toggle */}
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-300">{t('local.turnCounter')}</span>
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
              // Auto-add the logged-in user as the first player (name only, commander TBD)
              if (user) {
                addPlayer(user.username, {})
              }
              setPhase('players')
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {t('local.createRoom')}
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
            <h2 className="text-xl font-semibold text-white">{t('local.addPlayers')}</h2>
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded font-mono">
              {room.code}
            </span>
          </div>

          <p className="text-sm text-gray-400">
            {t('local.roomInfo', { format: t(`format.${room.config.format}`), life: room.config.startingLife })}
          </p>

          {/* Current players list */}
          {room.players.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">
                {t('local.playersCount', { count: room.players.length })}
              </h3>
              {room.players.map((p, idx) => {
                const isHost = idx === 0
                return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                    isHost ? 'bg-purple-900/30 border border-purple-700' : 'bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isHost && <span className="text-xs text-purple-400">👑</span>}
                    <span className="text-white text-sm truncate">{p.username}</span>
                    {p.commanderName && (
                      <span className="text-xs text-gray-400 truncate">
                        ({p.commanderName})
                      </span>
                    )}
                  </div>
                  {/* Only non-host players can be removed */}
                  {!isHost && (
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="text-red-400 hover:text-red-300 text-sm flex-shrink-0 ml-2"
                      aria-label={t('local.removePlayer', { name: p.username })}
                    >
                      ✕
                    </button>
                  )}
                </div>
                )
              })}

              {/* Commander search for host if in commander format and no commander yet */}
              {room.config.format === 'commander' && room.players[0] && !room.players[0].commanderName && (
                <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-purple-300 mb-2">{t('local.chooseCommander')}</p>
                  {/* Option 1: Pick from saved decks */}
                  {isAuthenticated && (
                    <DeckSelector
                      format={room.config.format}
                      onSelect={async (deck) => {
                        if (!room.players[0]) return
                        // Use commanderName from deck, fallback to deck name for search
                        const cmdName = deck.commanderName || ''
                        if (deck.commanderName || deck.id) {
                          if (deck.commanderImage) {
                            updatePlayerCommander(room.players[0].id, {
                              commanderName: deck.commanderName,
                              commanderImage: deck.commanderImage,
                              partnerName: deck.partnerName,
                              partnerImage: deck.partnerImage,
                            })
                          } else if (cmdName) {
                            // Search Scryfall for the commander image
                            const results = await searchCommanders(cmdName)
                            const card = results.find(c => c.name === cmdName) || results[0]
                            const artUrl = card ? getCardImageUrl(card, 'art_crop') : ''
                            updatePlayerCommander(room.players[0].id, {
                              commanderName: cmdName,
                              commanderImage: artUrl || undefined,
                              partnerName: deck.partnerName,
                              partnerImage: deck.partnerImage,
                            })
                          }
                        } else {
                          // "Sin mazo" — clear
                          updatePlayerCommander(room.players[0].id, {
                            commanderName: undefined,
                            commanderImage: undefined,
                            partnerName: undefined,
                            partnerImage: undefined,
                          })
                        }
                      }}
                    />
                  )}
                  {/* Option 2: Search manually (uses separate state from add-player form) */}
                  <CommanderSearch
                    value=""
                    onChange={() => {}}
                    onSelect={(commander, partner) => {
                      if (room.players[0]) {
                        updatePlayerCommander(room.players[0].id, {
                          commanderName: commander.name,
                          commanderImage: commander.image,
                          partnerName: partner?.name,
                          partnerImage: partner?.image,
                        })
                      }
                    }}
                    placeholder={t('local.searchCommanderAlt')}
                  />
                </div>
              )}
            </div>
          )}

          {/* Add player form */}
          {room.players.length < 12 && (
            <div className="space-y-3 border-t border-gray-800 pt-4">
              <input
                type="text"
                placeholder={t('local.playerNamePlaceholder')}
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
                  placeholder={t('local.searchCommander')}
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
                {t('local.addPlayer')}
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
            {t('local.startGame', { count: room.players.length })}
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

    const handleEndGame = async () => {
      // Pick the last active player as winner, or null
      const winner = activePlayers.length === 1 ? activePlayers[0].id : null
      const result = endGame(winner)
      setGameEnded(true)

      // Persist to backend
      if (result) {
        try {
          await saveGame({
            room_code: result.roomCode,
            format: result.format,
            starting_life: result.startingLife,
            poison_enabled: result.poisonEnabled,
            turn_counter_enabled: result.turnCounterEnabled,
            turn_count: result.turnCount,
            is_local: true,
            winner_name: result.players.find(p => p.isWinner)?.username || null,
            players: result.players.map(p => ({
              player_name: p.username,
              commander_name: p.commanderName,
              partner_name: p.partnerName,
              final_life: p.finalLife,
              final_poison: p.finalPoison,
              commander_damage_received: p.commanderDamage,
              is_winner: p.isWinner,
              elimination_cause: p.eliminationCause,
              elimination_order: p.eliminationOrder,
              deck_id: p.deckId,
            })),
          })
        } catch (err) {
          console.error('Error saving local game:', err)
        }
      }
    }

    const handleRestart = () => {
      restartGame()
      setGameEnded(false)
      setStarterId(null)
      setShowCmdDamage(null)
    }



    const buildDamageSources = (player: Player): { id: string; name: string; playerName?: string; image?: string; damage: number; isPartner?: boolean }[] => {
      const sources: { id: string; name: string; playerName?: string; image?: string; damage: number; isPartner?: boolean }[] = []
      for (const other of room.players) {
        if (other.id === player.id) continue
        // Main commander
        const mainId = other.id
        sources.push({
          id: mainId,
          name: other.commanderName || other.username,
          playerName: other.commanderName ? other.username : undefined,
          image: other.commanderImage,
          damage: player.commanderDamage[mainId] || 0,
        })
        // Partner (if any)
        if (other.partnerName) {
          const partnerId = `${other.id}_partner`
          sources.push({
            id: partnerId,
            name: other.partnerName,
            playerName: other.username,
            image: other.partnerImage,
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
            {t('game.localRoom')}{' '}
            <span className="text-purple-400 font-mono font-bold">{room.code}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {room.config.turnCounterEnabled && (
              <button
                type="button"
                onClick={incrementTurn}
                className="flex items-center gap-1.5 bg-amber-900/60 hover:bg-amber-800/70 border border-amber-600 text-amber-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                <span>🔄</span>
                <span className="text-sm">{t('game.turn')}</span>
                <span className="font-mono text-base font-bold">{room.turnCount}</span>
              </button>
            )}
            <span>{room.players.length}P • {t(`format.${room.config.format}`)}</span>
            <RoomSettings
              poisonEnabled={room.config.poisonEnabled}
              turnCounterEnabled={room.config.turnCounterEnabled}
              onTogglePoison={togglePoison}
              onToggleTurnCounter={toggleTurnCounter}
              showAddPlayer={!gameEnded}
              onAddPlayer={() => setShowAddPlayerModal(true)}
            />
          </div>
        </div>

        {/* Starter Picker — only show before game starts */}
        {!gameEnded && !gameStarted && (
          <StarterPicker
            players={room.players.map((p) => ({ id: p.id, username: p.username }))}
            selectedId={starterId}
            onSelect={handleSelectStarter}
          />
        )}

        {/* Last player standing notification */}
        {activePlayers.length === 1 && room.players.length >= 2 && !gameEnded && !showEndConfirm && (
          <div className="mx-2 mb-3 bg-yellow-900/50 border border-yellow-600 rounded-lg p-3 flex items-center justify-between">
            <span className="text-yellow-200 text-sm font-medium">
              {t('game.lastStanding', { name: activePlayers[0].username })}
            </span>
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-gray-900 font-semibold text-sm px-3 py-1 rounded-lg transition-colors"
            >
              {t('game.endGame')}
            </button>
          </div>
        )}

        {/* End game confirmation modal */}
        {showEndConfirm && !gameEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4 text-center shadow-2xl">
              <p className="text-3xl">🏆</p>
              <h3 className="text-xl font-bold text-white">
                {t('game.endGameConfirmTitle')}
              </h3>
              {activePlayers.length === 1 && (
                <p className="text-yellow-300 text-sm">
                  {t('game.lastStandingPlain', { name: activePlayers[0].username })}
                </p>
              )}
              <p className="text-gray-400 text-sm">
                {t('game.endGameLocalNote')}
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
                  {t('game.endGameConfirm')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {t('game.keepPlaying')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game ended banner */}
        {gameEnded && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-xl text-center">
            <p className="text-yellow-300 font-semibold text-lg">{t('game.gameOverLocal')}</p>
            {activePlayers.length === 1 && (
              <p className="text-yellow-200 text-sm mt-1">
                {t('game.winner', { name: activePlayers[0].username })}
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
              onArtChange={(artUrl) => updatePlayerArt(player.id, artUrl)}
              poisonSlot={
                !gameEnded && room.config.poisonEnabled ? (
                  <PoisonCounter
                    poison={player.poisonCounters}
                    onAdjust={(amount) => handleAdjustPoison(player.id, amount)}
                  />
                ) : undefined
              }
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

              {/* Commander Damage toggle */}
              {!gameEnded && room.config.format === 'commander' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setShowCmdDamage(showCmdDamage === player.id ? null : player.id)
                    }
                    className="mt-1 text-xs text-gray-200 hover:text-white transition-colors w-full text-center"
                  >
                    ⚔️ {t('game.commanderDamage')}
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

        {/* Add player mid-game modal */}
        {showAddPlayerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 w-full max-w-sm space-y-3">
              <h3 className="text-lg font-bold text-white">{t('local.addPlayerTitle')}</h3>
              <input
                type="text"
                placeholder={t('local.playerNamePlaceholder')}
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                maxLength={30}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
              />
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
                  placeholder={t('local.searchCommander')}
                />
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (newPlayerName.trim()) {
                      addPlayer(newPlayerName.trim(), {
                        commanderName: newCommanderName || undefined,
                        commanderImage: newCommanderImage || undefined,
                        partnerName: newPartnerName || undefined,
                        partnerImage: newPartnerImage || undefined,
                      })
                      setNewPlayerName('')
                      setNewCommanderName('')
                      setNewCommanderImage('')
                      setNewPartnerName('')
                      setNewPartnerImage('')
                      setShowAddPlayerModal(false)
                    }
                  }}
                  disabled={!newPlayerName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-2 rounded-lg transition-colors"
                >
                  {t('local.add')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 px-2">
          {!gameEnded && (
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {t('game.endGame')}
            </button>
          )}
          <button
            type="button"
            onClick={handleRestart}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
          >
            {gameEnded ? t('game.newGame') : t('game.restart')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 rounded-lg transition-colors"
          >
            {t('game.leavePlain')}
          </button>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
