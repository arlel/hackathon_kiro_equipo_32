import { useState, useEffect, useRef, useCallback } from 'react'
import type { Player } from '@/types/game'

export type ConnectionStatus = 'connected' | 'connecting' | 'error' | 'disconnected'

interface WebSocketMessage {
  type: string
  [key: string]: unknown
}

export interface StateUpdate {
  type: 'state_update'
  roomCode: string
  format: string
  config: { poisonEnabled: boolean; turnCounterEnabled: boolean }
  turnCount: number
  gameStarted?: boolean
  players: Player[]
  eliminationOrder: string[]
}

export interface StarterSelected {
  type: 'starter_selected'
  playerId: string
  playerName: string
}

export interface GameEnded {
  type: 'game_ended'
  winnerId: string | null
  winnerName: string | null
}

export interface UseWebSocketOptions {
  roomCode: string
  playerId: string
  playerName: string
  commanderName?: string
  commanderImage?: string
  partnerName?: string
  partnerImage?: string
  format?: string
  poisonEnabled?: boolean
  turnCounterEnabled?: boolean
  startingLife?: number
  deckId?: string
  onStateUpdate?: (state: StateUpdate) => void
  onStarterSelected?: (data: StarterSelected) => void
  onGameEnded?: (data: GameEnded) => void
  onError?: (message: string) => void
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [0, 2000, 4000] // immediate, 2s, 4s

export function useWebSocket(options: UseWebSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const actionQueueRef = useRef<string[]>([])
  const optionsRef = useRef(options)
  optionsRef.current = options

  const connect = useCallback(() => {
    const opts = optionsRef.current
    const params = new URLSearchParams({
      player_id: opts.playerId,
      player_name: opts.playerName,
      commander_name: opts.commanderName || '',
      commander_image: opts.commanderImage || '',
      format: opts.format || 'commander',
      partner_name: opts.partnerName || '',
      partner_image: opts.partnerImage || '',
      poison_enabled: String(opts.poisonEnabled || false),
      turn_counter_enabled: String(opts.turnCounterEnabled || false),
      starting_life: String(opts.startingLife || 0),
      deck_id: opts.deckId || '',
      // Sent so the server can attribute online games to the logged-in account.
      token: localStorage.getItem('token') || '',
    })

    const wsBase = import.meta.env.VITE_WS_URL
      ? import.meta.env.VITE_WS_URL
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

    const wsUrl = `${wsBase}/game-ws/${opts.roomCode}?${params}`

    setStatus('connecting')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setStatus('connected')
      retriesRef.current = 0
      // Flush queued actions
      while (actionQueueRef.current.length > 0) {
        const msg = actionQueueRef.current.shift()!
        ws.send(msg)
      }
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as WebSocketMessage
      switch (data.type) {
        case 'state_update':
          optionsRef.current.onStateUpdate?.(data as unknown as StateUpdate)
          break
        case 'starter_selected':
          optionsRef.current.onStarterSelected?.(data as unknown as StarterSelected)
          break
        case 'game_ended':
          optionsRef.current.onGameEnded?.(data as unknown as GameEnded)
          break
        case 'error':
          optionsRef.current.onError?.(data.message as string)
          break
      }
    }

    ws.onclose = (event) => {
      wsRef.current = null
      if (event.code === 4001) {
        // Room full — don't retry
        setStatus('error')
        optionsRef.current.onError?.('La sala está llena (máximo 12 jugadores)')
        return
      }
      if (retriesRef.current < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retriesRef.current] || 4000
        setStatus('connecting')
        setTimeout(() => {
          retriesRef.current++
          connect()
        }, delay)
      } else {
        setStatus('error')
      }
    }

    ws.onerror = () => {
      // onclose will fire after this
    }
  }, [])

  const sendAction = useCallback((action: Record<string, unknown>) => {
    const msg = JSON.stringify(action)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg)
    } else {
      actionQueueRef.current.push(msg)
    }
  }, [])

  const disconnect = useCallback(() => {
    retriesRef.current = MAX_RETRIES // Prevent reconnection attempts
    wsRef.current?.close()
    wsRef.current = null
    setStatus('disconnected')
  }, [])

  useEffect(() => {
    let cancelled = false

    // Small delay avoids the "WebSocket closed before connection established"
    // warning caused by React 19 StrictMode double-invoking effects.
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        connect()
      }
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      retriesRef.current = MAX_RETRIES // Prevent reconnection on cleanup
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { status, sendAction, disconnect }
}
