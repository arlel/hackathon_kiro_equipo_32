import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalRoom } from '@/hooks/useLocalRoom'

describe('useLocalRoom', () => {
  const commanderConfig = {
    format: 'commander' as const,
    startingLife: 40,
    poisonEnabled: true,
    turnCounterEnabled: true,
  }

  describe('createRoom', () => {
    it('creates a room with commander format and correct config', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => {
        result.current.createRoom(commanderConfig)
      })

      expect(result.current.room).not.toBeNull()
      expect(result.current.room!.config.format).toBe('commander')
      expect(result.current.room!.config.startingLife).toBe(40)
      expect(result.current.room!.config.poisonEnabled).toBe(true)
      expect(result.current.room!.config.turnCounterEnabled).toBe(true)
      expect(result.current.room!.players).toHaveLength(0)
      expect(result.current.room!.turnCount).toBe(0)
      expect(result.current.room!.code).toHaveLength(6)
    })

    it('generates a 6-char alphanumeric room code', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => {
        result.current.createRoom(commanderConfig)
      })

      expect(result.current.room!.code).toMatch(/^[A-Z0-9]{6}$/)
    })
  })

  describe('deck tracking', () => {
    it('keeps a deck id set via updatePlayerCommander in the end-game result', () => {
      // Regression: the host picks a saved deck through the commander picker
      // (updatePlayerCommander). Its deck id must survive to the save payload
      // so by-deck stats can be attributed to the user.
      const { result } = renderHook(() => useLocalRoom())

      act(() => {
        result.current.createRoom(commanderConfig)
      })
      act(() => {
        result.current.addPlayer('Host', {}) // host auto-added without a deck
      })
      act(() => {
        result.current.addPlayer('Rival', {})
      })

      const hostId = result.current.room!.players[0].id
      act(() => {
        result.current.updatePlayerCommander(hostId, {
          commanderName: 'Atraxa',
          deckId: 'deck-123',
        })
      })

      expect(result.current.room!.players[0].deckId).toBe('deck-123')

      let saved: ReturnType<typeof result.current.endGame> = null
      act(() => {
        saved = result.current.endGame(hostId)
      })

      expect(saved!.players[0].deckId).toBe('deck-123')
    })

    it('preserves a deck id provided at addPlayer time', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => {
        result.current.createRoom(commanderConfig)
      })
      act(() => {
        result.current.addPlayer('Alice', { commanderName: 'Atraxa', deckId: 'deck-abc' })
      })

      expect(result.current.room!.players[0].deckId).toBe('deck-abc')
    })
  })

  describe('addPlayer', () => {
    it('adds players with correct starting life from config', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => {
        result.current.createRoom(commanderConfig)
      })
      act(() => {
        result.current.addPlayer('Alice', { commanderName: 'Atraxa' })
      })
      act(() => {
        result.current.addPlayer('Bob', { commanderName: 'Korvold' })
      })
      act(() => {
        result.current.addPlayer('Carlos', { commanderName: 'Muldrotha' })
      })

      expect(result.current.room!.players).toHaveLength(3)
      expect(result.current.room!.players[0].username).toBe('Alice')
      expect(result.current.room!.players[0].life).toBe(40)
      expect(result.current.room!.players[0].poisonCounters).toBe(0)
      expect(result.current.room!.players[0].commanderName).toBe('Atraxa')
      expect(result.current.room!.players[1].username).toBe('Bob')
      expect(result.current.room!.players[2].username).toBe('Carlos')
    })
  })

  describe('adjustLife', () => {
    it('increases life correctly', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustLife(playerId, 5) })

      expect(result.current.room!.players[0].life).toBe(45)
    })

    it('decreases life correctly', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustLife(playerId, -10) })

      expect(result.current.room!.players[0].life).toBe(30)
    })

    it('allows life to go below zero', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustLife(playerId, -50) })

      expect(result.current.room!.players[0].life).toBe(-10)
    })
  })

  describe('adjustPoison', () => {
    it('increases poison counters', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustPoison(playerId, 3) })

      expect(result.current.room!.players[0].poisonCounters).toBe(3)
    })

    it('does not allow poison to go below zero', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustPoison(playerId, -5) })

      expect(result.current.room!.players[0].poisonCounters).toBe(0)
    })
  })

  describe('applyCommanderDamage', () => {
    it('applies commander damage and reduces life', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })
      act(() => { result.current.addPlayer('Bob') })

      const alice = result.current.room!.players[0].id
      const bob = result.current.room!.players[1].id

      act(() => { result.current.applyCommanderDamage(alice, bob, 7) })

      // Bob takes 7 commander damage from Alice
      expect(result.current.room!.players[1].commanderDamage[alice]).toBe(7)
      // Bob's life reduced by 7
      expect(result.current.room!.players[1].life).toBe(33)
    })

    it('accumulates commander damage from same source', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })
      act(() => { result.current.addPlayer('Bob') })

      const alice = result.current.room!.players[0].id
      const bob = result.current.room!.players[1].id

      act(() => { result.current.applyCommanderDamage(alice, bob, 10) })
      act(() => { result.current.applyCommanderDamage(alice, bob, 12) })

      expect(result.current.room!.players[1].commanderDamage[alice]).toBe(22)
      expect(result.current.room!.players[1].life).toBe(18) // 40 - 10 - 12
    })
  })

  describe('checkElimination', () => {
    it('eliminates player when life <= 0 (daño normal)', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustLife(playerId, -40) })
      act(() => { result.current.checkElimination(playerId) })

      expect(result.current.room!.players[0].eliminationCause).toBe('daño normal')
      expect(result.current.room!.players[0].eliminationOrder).toBe(1)
    })

    it('eliminates player when poison >= 10 (veneno)', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustPoison(playerId, 10) })
      act(() => { result.current.checkElimination(playerId) })

      expect(result.current.room!.players[0].eliminationCause).toBe('veneno')
    })

    it('eliminates player when commander damage >= 21 (daño de comandante)', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })
      act(() => { result.current.addPlayer('Bob') })

      const alice = result.current.room!.players[0].id
      const bob = result.current.room!.players[1].id

      act(() => { result.current.applyCommanderDamage(alice, bob, 21) })
      act(() => { result.current.checkElimination(bob) })

      expect(result.current.room!.players[1].eliminationCause).toBe('daño de comandante')
    })

    it('returns null if player is not eliminated', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.checkElimination(playerId) })

      expect(result.current.room!.players[0].eliminationCause).toBeUndefined()
    })

    it('assigns sequential elimination orders', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })
      act(() => { result.current.addPlayer('Bob') })

      const alice = result.current.room!.players[0].id
      const bob = result.current.room!.players[1].id

      act(() => { result.current.adjustLife(alice, -40) })
      act(() => { result.current.checkElimination(alice) })

      act(() => { result.current.adjustLife(bob, -40) })
      act(() => { result.current.checkElimination(bob) })

      expect(result.current.room!.players[0].eliminationOrder).toBe(1)
      expect(result.current.room!.players[1].eliminationOrder).toBe(2)
    })
  })

  describe('revivePlayer', () => {
    it('removes elimination state from a player', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })

      const playerId = result.current.room!.players[0].id

      act(() => { result.current.adjustLife(playerId, -40) })
      act(() => { result.current.checkElimination(playerId) })

      // Player is eliminated
      expect(result.current.room!.players[0].eliminationCause).toBe('daño normal')

      act(() => { result.current.revivePlayer(playerId) })

      expect(result.current.room!.players[0].eliminationCause).toBeUndefined()
      expect(result.current.room!.players[0].eliminationOrder).toBeUndefined()
    })

    it('adjusts elimination orders of other eliminated players', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })
      act(() => { result.current.addPlayer('Bob') })
      act(() => { result.current.addPlayer('Carlos') })

      const alice = result.current.room!.players[0].id
      const bob = result.current.room!.players[1].id
      const carlos = result.current.room!.players[2].id

      // Eliminate Alice (order 1), then Bob (order 2), then Carlos (order 3)
      act(() => { result.current.adjustLife(alice, -40) })
      act(() => { result.current.checkElimination(alice) })
      act(() => { result.current.adjustLife(bob, -40) })
      act(() => { result.current.checkElimination(bob) })
      act(() => { result.current.adjustLife(carlos, -40) })
      act(() => { result.current.checkElimination(carlos) })

      // Revive Alice (was order 1) → Bob should become 1, Carlos becomes 2
      act(() => { result.current.revivePlayer(alice) })

      expect(result.current.room!.players[0].eliminationOrder).toBeUndefined()
      expect(result.current.room!.players[1].eliminationOrder).toBe(1)
      expect(result.current.room!.players[2].eliminationOrder).toBe(2)
    })
  })

  describe('restartGame', () => {
    it('resets all players to starting life and clears state', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice') })
      act(() => { result.current.addPlayer('Bob') })
      act(() => { result.current.addPlayer('Carlos') })

      const alice = result.current.room!.players[0].id
      const bob = result.current.room!.players[1].id

      // Modify game state
      act(() => { result.current.adjustLife(alice, -15) })
      act(() => { result.current.adjustPoison(bob, 5) })
      act(() => { result.current.applyCommanderDamage(alice, bob, 10) })
      act(() => { result.current.incrementTurn() })
      act(() => { result.current.incrementTurn() })

      // Eliminate Alice
      act(() => { result.current.adjustLife(alice, -25) })
      act(() => { result.current.checkElimination(alice) })

      // Restart
      act(() => { result.current.restartGame() })

      // All players reset to starting life
      expect(result.current.room!.players[0].life).toBe(40)
      expect(result.current.room!.players[1].life).toBe(40)
      expect(result.current.room!.players[2].life).toBe(40)

      // Poison reset
      expect(result.current.room!.players[1].poisonCounters).toBe(0)

      // Commander damage reset
      expect(result.current.room!.players[1].commanderDamage).toEqual({})

      // Turn counter reset
      expect(result.current.room!.turnCount).toBe(0)

      // Elimination state cleared
      expect(result.current.room!.players[0].eliminationCause).toBeUndefined()
      expect(result.current.room!.players[0].eliminationOrder).toBeUndefined()
      expect(result.current.room!.eliminationCounter).toBe(0)
    })

    it('preserves player identities after restart', () => {
      const { result } = renderHook(() => useLocalRoom())

      act(() => { result.current.createRoom(commanderConfig) })
      act(() => { result.current.addPlayer('Alice', { commanderName: 'Atraxa' }) })

      const originalId = result.current.room!.players[0].id

      act(() => { result.current.restartGame() })

      expect(result.current.room!.players[0].id).toBe(originalId)
      expect(result.current.room!.players[0].username).toBe('Alice')
      expect(result.current.room!.players[0].commanderName).toBe('Atraxa')
    })
  })

  describe('complete game flow', () => {
    it('handles a full commander game lifecycle', () => {
      const { result } = renderHook(() => useLocalRoom())

      // 1. Create room
      act(() => { result.current.createRoom(commanderConfig) })
      expect(result.current.room).not.toBeNull()

      // 2. Add 3 players
      act(() => { result.current.addPlayer('Alice', { commanderName: 'Atraxa' }) })
      act(() => { result.current.addPlayer('Bob', { commanderName: 'Korvold' }) })
      act(() => { result.current.addPlayer('Carlos', { commanderName: 'Muldrotha' }) })
      expect(result.current.room!.players).toHaveLength(3)

      const alice = result.current.room!.players[0].id
      const bob = result.current.room!.players[1].id
      const carlos = result.current.room!.players[2].id

      // 3. Adjust life
      act(() => { result.current.adjustLife(alice, -5) })
      expect(result.current.room!.players[0].life).toBe(35)

      // 4. Adjust poison
      act(() => { result.current.adjustPoison(bob, 4) })
      expect(result.current.room!.players[1].poisonCounters).toBe(4)

      // 5. Apply commander damage
      act(() => { result.current.applyCommanderDamage(alice, carlos, 15) })
      expect(result.current.room!.players[2].commanderDamage[alice]).toBe(15)
      expect(result.current.room!.players[2].life).toBe(25)

      // 6. Increment turn
      act(() => { result.current.incrementTurn() })
      expect(result.current.room!.turnCount).toBe(1)

      // 7. Eliminate Bob via poison
      act(() => { result.current.adjustPoison(bob, 6) }) // total: 10
      act(() => { result.current.checkElimination(bob) })
      expect(result.current.room!.players[1].eliminationCause).toBe('veneno')
      expect(result.current.room!.players[1].eliminationOrder).toBe(1)

      // 8. Revive Bob
      act(() => { result.current.revivePlayer(bob) })
      expect(result.current.room!.players[1].eliminationCause).toBeUndefined()

      // 9. Restart game
      act(() => { result.current.restartGame() })
      expect(result.current.room!.players[0].life).toBe(40)
      expect(result.current.room!.players[1].poisonCounters).toBe(0)
      expect(result.current.room!.players[2].commanderDamage).toEqual({})
      expect(result.current.room!.turnCount).toBe(0)
    })
  })
})
