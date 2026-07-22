export type GameFormat = 'commander' | 'standard' | 'modern' | 'pauper' | 'custom'

export interface Player {
  id: string
  username: string
  life: number
  commanderDamage: Record<string, number> // commanderId -> damage received
  commanderName?: string
  commanderImage?: string // art_crop URL from Scryfall
  color?: string
  isConnected: boolean
}

export interface GameRoom {
  code: string
  format: GameFormat
  startingLife: number
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
  finalLife: number
  isWinner: boolean
}

export interface UserStats {
  totalGames: number
  wins: number
  winRate: number
  favoriteCommander: string
  gamesPerFormat: Record<GameFormat, number>
}
