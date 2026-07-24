export type GameFormat = 'commander' | '20vida' | 'custom'

export type EliminationCause = 'daño normal' | 'daño de comandante' | 'veneno'

export interface RoomConfig {
  format: GameFormat
  startingLife: number
  poisonEnabled: boolean
  turnCounterEnabled: boolean
}

export interface Player {
  id: string
  username: string
  life: number
  poisonCounters: number
  commanderDamage: Record<string, number> // commanderSourceId -> damage
  commanderName?: string
  commanderImage?: string
  partnerName?: string
  partnerImage?: string
  isConnected: boolean
  eliminationCause?: EliminationCause
  eliminationOrder?: number
  deckId?: string
}

export interface GameRoom {
  code: string
  format: GameFormat
  config: RoomConfig
  players: Player[]
  createdAt: string
  isActive: boolean
  turnCount: number
}

export interface GameRecord {
  id: string
  roomCode: string
  format: GameFormat
  players: PlayerResult[]
  winnerId?: string
  startedAt: string
  endedAt: string
  turnCount: number
}

export interface PlayerResult {
  userId: string
  username: string
  commanderName?: string
  partnerName?: string
  finalLife: number
  finalPoison: number
  isWinner: boolean
  eliminationCause?: EliminationCause
  eliminationOrder?: number
}

export interface UserStats {
  totalGames: number
  wins: number
  winRate: number
  favoriteCommander: string
  gamesPerFormat: Record<GameFormat, number>
}

export interface DeckRecord {
  id: string
  name: string
  commanderName?: string
  commanderImage?: string
  partnerName?: string
  partnerImage?: string
  format: GameFormat
  status: 'active' | 'inactive'
  totalGames: number
  winRate: number
  lastUsedAt?: string
}

export interface GeneralStats {
  totalGames: number
  wins: number
  winRate: number
  eliminationsByNormal: number
  eliminationsByCommander: number
  eliminationsByPoison: number
}

export interface DeckStats {
  deckId: string
  deckName: string
  totalGames: number
  wins: number
  winRate: number
  players: string[]
}

export interface RivalStats {
  rivalName: string
  totalGames: number
  userWins: number
  winRate: number
}

export interface GameLogEntry {
  date: string
  players: { name: string; deck?: string; eliminationOrder?: number }[]
}
