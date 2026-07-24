import type { DeckRecord, GeneralStats, DeckStats, RivalStats, GameLogEntry } from '@/types/game'

const BASE_URL = '/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new Error('Token inválido o expirado')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error del servidor' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// Auth
export async function login(email: string, password: string) {
  return request<{ access_token: string; token_type: string; user: { id: string; username: string; email: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function register(username: string, email: string, password: string) {
  return request<{ id: string; username: string; email: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })
}

// History
export async function getHistory() {
  return request<unknown[]>('/games/history')
}

// Stats
export async function getGeneralStats() {
  return request<GeneralStats>('/games/stats')
}

export async function getStatsByDeck() {
  return request<DeckStats[]>('/games/stats/by-deck')
}

export async function getStatsByRival() {
  return request<RivalStats[]>('/games/stats/by-rival')
}

export async function getGameLog() {
  return request<GameLogEntry[]>('/games/stats/log')
}

// Game edit
export async function editGamePlayer(gameId: string, playerName: string, data: { elimination_cause?: string; elimination_order?: number }) {
  return request<unknown>(`/games/${gameId}/edit?player_name=${encodeURIComponent(playerName)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Decks CRUD
export async function listDecks() {
  return request<DeckRecord[]>('/decks/')
}

export async function createDeck(data: { name: string; commander_name?: string; commander_image?: string; partner_name?: string; partner_image?: string; format: string }) {
  return request<DeckRecord>('/decks/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDeck(deckId: string, data: { status: string }) {
  return request<DeckRecord>(`/decks/${deckId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDeck(deckId: string) {
  return request<void>(`/decks/${deckId}`, {
    method: 'DELETE',
  })
}

// Room validation
export async function validateRoom(code: string) {
  return request<{ code: string; format: string; startingLife: number; connectedPlayers: number; maxPlayers: number; poisonEnabled: boolean; turnCounterEnabled: boolean }>(`/rooms/validate/${code}`, {
    method: 'POST',
  })
}
