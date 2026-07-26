import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GameRecord, PlayerResult, EliminationCause } from '@/types/game'
import { editGamePlayer, getHistory } from '@/services/api'

function getEliminationLabel(cause: EliminationCause | undefined): string | null {
  switch (cause) {
    case 'daño normal':
      return '💀 daño normal'
    case 'daño de comandante':
      return '⚔️ daño de comandante'
    case 'veneno':
      return '☠️ veneno'
    default:
      return null
  }
}

interface EditState {
  gameId: string
  playerName: string
  eliminationCause: EliminationCause | null
  eliminationOrder: number | null
}

export default function History() {
  const navigate = useNavigate()
  const [games, setGames] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }

        const data = await getHistory()
        setGames(data as GameRecord[])
      } catch (err) {
        console.error('Error fetching history:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [navigate])

  const handleOpenEdit = (gameId: string) => {
    setEditingGameId(editingGameId === gameId ? null : gameId)
    setEditState(null)
  }

  const handleSelectPlayer = (gameId: string, player: PlayerResult) => {
    setEditState({
      gameId,
      playerName: player.username,
      eliminationCause: player.eliminationCause ?? null,
      eliminationOrder: player.eliminationOrder ?? null,
    })
  }

  const handleSave = async () => {
    if (!editState) return
    setSaving(true)
    try {
      await editGamePlayer(editState.gameId, editState.playerName, {
        elimination_cause: editState.eliminationCause ?? undefined,
        elimination_order: editState.eliminationOrder ?? undefined,
      })

      // Update local state to reflect the change
      setGames((prev) =>
        prev.map((g) => {
          if (g.id !== editState.gameId) return g
          return {
            ...g,
            players: g.players.map((p) => {
              if (p.username !== editState.playerName) return p
              return {
                ...p,
                eliminationCause: editState.eliminationCause ?? undefined,
                eliminationOrder: editState.eliminationOrder ?? undefined,
              }
            }),
          }
        })
      )
      setEditState(null)
    } catch (err) {
      console.error('Error saving edit:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Cargando historial...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📊 Historial de Partidas</h1>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Volver
        </button>
      </div>

      {games.length === 0 ? (
        <p className="text-gray-400 text-center mt-12">No hay partidas registradas aún.</p>
      ) : (
        <div className="space-y-3">
          {games.map((game) => (
            <div key={game.id} className="bg-[var(--color-bg-card)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-purple-400 font-mono">{game.format}</span>
                <span className="text-xs text-gray-500">
                  {new Date(game.endedAt).toLocaleDateString('es-AR')}
                </span>
              </div>

              {/* Players list with elimination info */}
              <div className="space-y-1">
                {game.players.map((p) => (
                  <div key={p.userId} className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        p.isWinner ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {p.username} {p.isWinner && '👑'}
                    </span>

                    {p.partnerName && (
                      <span className="text-xs text-indigo-400">
                        🤝 {p.partnerName}
                      </span>
                    )}

                    {p.eliminationOrder != null && (
                      <span className="text-xs text-yellow-500 font-mono">
                        #{p.eliminationOrder}
                      </span>
                    )}

                    {p.eliminationCause && (
                      <span className="text-xs text-red-400">
                        {getEliminationLabel(p.eliminationCause)}
                      </span>
                    )}

                    {p.finalPoison > 0 && (
                      <span className="text-xs text-emerald-400">
                        🧪 {p.finalPoison} veneno
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500">{game.turnCount} turnos</p>
                <button
                  onClick={() => handleOpenEdit(game.id)}
                  className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 hover:bg-purple-800/60 transition-colors"
                >
                  {editingGameId === game.id ? 'Cerrar' : 'Editar'}
                </button>
              </div>

              {/* Inline edit panel */}
              {editingGameId === game.id && (
                <div className="mt-3 border-t border-gray-700 pt-3 space-y-3">
                  <p className="text-xs text-gray-400 mb-2">Selecciona un jugador para editar:</p>
                  <div className="flex flex-wrap gap-1">
                    {game.players.map((p) => (
                      <button
                        key={p.userId}
                        onClick={() => handleSelectPlayer(game.id, p)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          editState?.playerName === p.username
                            ? 'bg-purple-700 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {p.username}
                      </button>
                    ))}
                  </div>

                  {editState && editState.gameId === game.id && (
                    <div className="space-y-2 bg-gray-800/50 rounded-lg p-3">
                      <p className="text-sm text-gray-200 font-medium">
                        Editando: {editState.playerName}
                      </p>

                      {/* Elimination cause dropdown */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          Causa de eliminación
                        </label>
                        <select
                          value={editState.eliminationCause ?? ''}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              eliminationCause: (e.target.value || null) as EliminationCause | null,
                            })
                          }
                          className="w-full text-sm bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-gray-200 focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Sin causa</option>
                          <option value="daño normal">💀 daño normal</option>
                          <option value="daño de comandante">⚔️ daño de comandante</option>
                          <option value="veneno">☠️ veneno</option>
                        </select>
                      </div>

                      {/* Elimination order number input */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">
                          Orden de eliminación
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={editState.eliminationOrder ?? ''}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              eliminationOrder: e.target.value ? parseInt(e.target.value, 10) : null,
                            })
                          }
                          placeholder="Ej: 1, 2, 3..."
                          className="w-full text-sm bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      {/* Save button */}
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full text-sm px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
