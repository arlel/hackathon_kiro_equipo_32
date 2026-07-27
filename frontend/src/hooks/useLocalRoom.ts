import { useState, useCallback } from 'react'
import type { Player, RoomConfig, EliminationCause, GameFormat } from '@/types/game'

interface LocalPlayer extends Player {
  eliminationCause?: EliminationCause
  eliminationOrder?: number
}

interface LocalRoomState {
  code: string
  config: RoomConfig
  players: LocalPlayer[]
  turnCount: number
  eliminationCounter: number
}

interface GameResult {
  roomCode: string
  format: GameFormat
  startingLife: number
  poisonEnabled: boolean
  turnCounterEnabled: boolean
  turnCount: number | null
  winnerId: string | null
  players: {
    id: string
    username: string
    commanderName?: string
    partnerName?: string
    finalLife: number
    finalPoison: number
    commanderDamage: Record<string, number>
    isWinner: boolean
    eliminationCause?: EliminationCause
    eliminationOrder?: number
    deckId?: string
  }[]
}

export function useLocalRoom() {
  const [room, setRoom] = useState<LocalRoomState | null>(null)

  const createRoom = useCallback((config: RoomConfig) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    setRoom({
      code,
      config,
      players: [],
      turnCount: 0,
      eliminationCounter: 0,
    })
  }, [])

  const addPlayer = useCallback((name: string, options?: {
    commanderName?: string
    commanderImage?: string
    partnerName?: string
    partnerImage?: string
    deckId?: string
  }) => {
    setRoom(prev => {
      if (!prev) return prev
      const id = crypto.randomUUID()
      const newPlayer: LocalPlayer = {
        id,
        username: name,
        life: prev.config.startingLife,
        poisonCounters: 0,
        commanderDamage: {},
        commanderName: options?.commanderName,
        commanderImage: options?.commanderImage,
        partnerName: options?.partnerName,
        partnerImage: options?.partnerImage,
        isConnected: true,
        deckId: options?.deckId,
      }
      return { ...prev, players: [...prev.players, newPlayer] }
    })
  }, [])

  const removePlayer = useCallback((playerId: string) => {
    setRoom(prev => {
      if (!prev) return prev
      return { ...prev, players: prev.players.filter(p => p.id !== playerId) }
    })
  }, [])

  const adjustLife = useCallback((targetId: string, amount: number) => {
    setRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.id !== targetId) return p
          const newLife = p.life + amount
          // Auto-revive if life goes above 0 and player was eliminated by "daño normal"
          if (newLife > 0 && p.eliminationCause === 'daño normal') {
            return { ...p, life: newLife, eliminationCause: undefined, eliminationOrder: undefined }
          }
          return { ...p, life: newLife }
        }),
      }
    })
  }, [])

  const adjustPoison = useCallback((targetId: string, amount: number) => {
    setRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.id !== targetId) return p
          const newPoison = Math.max(0, p.poisonCounters + amount)
          // Auto-revive if poison drops below 10 and player was eliminated by poison
          if (newPoison < 10 && p.eliminationCause === 'veneno') {
            return { ...p, poisonCounters: newPoison, eliminationCause: undefined, eliminationOrder: undefined }
          }
          return { ...p, poisonCounters: newPoison }
        }),
      }
    })
  }, [])

  const applyCommanderDamage = useCallback((sourceId: string, targetId: string, amount: number) => {
    setRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.map(p => {
          if (p.id !== targetId) return p
          const current = p.commanderDamage[sourceId] || 0
          const newValue = Math.max(0, current + amount)
          const actualChange = newValue - current
          return {
            ...p,
            life: p.life - actualChange,
            commanderDamage: { ...p.commanderDamage, [sourceId]: newValue },
          }
        }),
      }
    })
  }, [])

  const incrementTurn = useCallback(() => {
    setRoom(prev => {
      if (!prev || !prev.config.turnCounterEnabled) return prev
      return { ...prev, turnCount: prev.turnCount + 1 }
    })
  }, [])

  const selectRandomStarter = useCallback((): string | null => {
    if (!room) return null
    const active = room.players.filter(p => p.isConnected && !p.eliminationCause)
    if (active.length === 0) return null
    const selected = active[Math.floor(Math.random() * active.length)]
    return selected.id
  }, [room])

  const checkElimination = useCallback((playerId: string): EliminationCause | null => {
    let cause: EliminationCause | null = null
    setRoom(prev => {
      if (!prev) return prev
      const player = prev.players.find(p => p.id === playerId)
      if (!player || player.eliminationCause) return prev

      if (player.poisonCounters >= 10) cause = 'veneno'
      else if (Object.values(player.commanderDamage).some(d => d >= 21)) cause = 'daño de comandante'
      else if (player.life <= 0) cause = 'daño normal'
      else return prev // No elimination

      const newCounter = prev.eliminationCounter + 1
      return {
        ...prev,
        eliminationCounter: newCounter,
        players: prev.players.map(p =>
          p.id === playerId
            ? { ...p, eliminationCause: cause!, eliminationOrder: newCounter }
            : p
        ),
      }
    })
    return cause
  }, [])

  const revivePlayer = useCallback((playerId: string) => {
    setRoom(prev => {
      if (!prev) return prev
      const player = prev.players.find(p => p.id === playerId)
      if (!player || !player.eliminationCause) return prev

      const oldOrder = player.eliminationOrder!
      return {
        ...prev,
        eliminationCounter: prev.eliminationCounter - 1,
        players: prev.players.map(p => {
          if (p.id === playerId) return { ...p, eliminationCause: undefined, eliminationOrder: undefined }
          if (p.eliminationOrder && p.eliminationOrder > oldOrder) return { ...p, eliminationOrder: p.eliminationOrder - 1 }
          return p
        }),
      }
    })
  }, [])

  const endGame = useCallback((winnerId: string | null): GameResult | null => {
    if (!room) return null
    return {
      roomCode: room.code,
      format: room.config.format,
      startingLife: room.config.startingLife,
      poisonEnabled: room.config.poisonEnabled,
      turnCounterEnabled: room.config.turnCounterEnabled,
      turnCount: room.config.turnCounterEnabled ? room.turnCount : null,
      winnerId,
      players: room.players.map(p => ({
        id: p.id,
        username: p.username,
        commanderName: p.commanderName,
        partnerName: p.partnerName,
        finalLife: p.life,
        finalPoison: p.poisonCounters,
        commanderDamage: p.commanderDamage,
        isWinner: p.id === winnerId,
        eliminationCause: p.eliminationCause,
        eliminationOrder: p.eliminationOrder,
        deckId: p.deckId,
      })),
    }
  }, [room])

  const restartGame = useCallback(() => {
    setRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        turnCount: 0,
        eliminationCounter: 0,
        players: prev.players.map(p => ({
          ...p,
          life: prev.config.startingLife,
          poisonCounters: 0,
          commanderDamage: {},
          eliminationCause: undefined,
          eliminationOrder: undefined,
        })),
      }
    })
  }, [])

  const togglePoison = useCallback((enabled: boolean) => {
    setRoom(prev => {
      if (!prev) return prev
      return { ...prev, config: { ...prev.config, poisonEnabled: enabled } }
    })
  }, [])

  const toggleTurnCounter = useCallback((enabled: boolean) => {
    setRoom(prev => {
      if (!prev) return prev
      return { ...prev, config: { ...prev.config, turnCounterEnabled: enabled } }
    })
  }, [])

  const updatePlayerArt = useCallback((playerId: string, artUrl: string) => {
    setRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, commanderImage: artUrl } : p
        ),
      }
    })
  }, [])

  const updatePlayerCommander = useCallback((playerId: string, data: {
    commanderName?: string
    commanderImage?: string
    partnerName?: string
    partnerImage?: string
  }) => {
    setRoom(prev => {
      if (!prev) return prev
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, ...data } : p
        ),
      }
    })
  }, [])

  return {
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
    revivePlayer,
    endGame,
    restartGame,
    togglePoison,
    toggleTurnCounter,
    updatePlayerArt,
    updatePlayerCommander,
  }
}
