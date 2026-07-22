import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { GameRecord } from '@/types/game'

export default function History() {
  const navigate = useNavigate()
  const [games, setGames] = useState<GameRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          setLoading(false)
          return
        }

        const res = await fetch('/api/games/history', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setGames(data)
        }
      } catch (err) {
        console.error('Error fetching history:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [navigate])

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
              <div className="flex flex-wrap gap-2">
                {game.players.map((p) => (
                  <span
                    key={p.userId}
                    className={`text-sm px-2 py-1 rounded ${
                      p.isWinner ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {p.username} {p.isWinner && '👑'}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{game.turnCount} turnos</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
