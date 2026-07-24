import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getGeneralStats, getStatsByDeck, getStatsByRival, getGameLog } from '@/services/api'
import { generateStatsCsv, downloadCsv } from '@/services/csv'
import type { GeneralStats, DeckStats, RivalStats, GameLogEntry } from '@/types/game'

type Tab = 'general' | 'deck' | 'rival' | 'log'

export default function Stats() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(true)

  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null)
  const [deckStats, setDeckStats] = useState<DeckStats[]>([])
  const [rivalStats, setRivalStats] = useState<RivalStats[]>([])
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [general, decks, rivals, log] = await Promise.all([
          getGeneralStats(),
          getStatsByDeck(),
          getStatsByRival(),
          getGameLog(),
        ])
        setGeneralStats(general)
        setDeckStats(decks)
        setRivalStats(rivals)
        setGameLog(log)
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-gray-400 text-lg">Debes iniciar sesión para ver las estadísticas.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
        >
          Iniciar sesión
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Cargando estadísticas...</p>
      </div>
    )
  }

  const handleExportCsv = () => {
    if (!generalStats || !user) return
    const csv = generateStatsCsv(generalStats, deckStats, rivalStats)
    downloadCsv(csv, user.username)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'deck', label: 'Por Mazo' },
    { key: 'rival', label: 'Por Rival' },
    { key: 'log', label: 'Log de Partidas' },
  ]

  return (
    <div className="min-h-screen p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📈 Estadísticas</h1>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Volver
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-gray-800/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mb-6">
        {activeTab === 'general' && generalStats && <GeneralTab stats={generalStats} />}
        {activeTab === 'deck' && <DeckTab stats={deckStats} />}
        {activeTab === 'rival' && <RivalTab stats={rivalStats} />}
        {activeTab === 'log' && <LogTab entries={gameLog} />}
      </div>

      {/* Export CSV button */}
      <div className="flex justify-center">
        <button
          onClick={handleExportCsv}
          className="px-5 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
        >
          📥 Exportar CSV
        </button>
      </div>
    </div>
  )
}

function GeneralTab({ stats }: { stats: GeneralStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Partidas" value={stats.totalGames} />
        <StatCard label="Victorias" value={stats.wins} />
        <StatCard label="% Victorias" value={`${stats.winRate}%`} highlight />
      </div>
      <div className="bg-gray-800/50 rounded-xl p-4">
        <h3 className="text-sm text-gray-400 mb-3">Eliminaciones recibidas</h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Daño Normal" value={stats.eliminationsByNormal} small />
          <StatCard label="Daño Comandante" value={stats.eliminationsByCommander} small />
          <StatCard label="Veneno" value={stats.eliminationsByPoison} small />
        </div>
      </div>
    </div>
  )
}

function DeckTab({ stats }: { stats: DeckStats[] }) {
  if (stats.length === 0) {
    return <p className="text-gray-400 text-center py-8">No hay estadísticas por mazo.</p>
  }

  return (
    <div className="space-y-3">
      {stats.map((deck) => (
        <div key={deck.deckId} className="bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-white">{deck.deckName}</span>
            <span className="text-sm text-purple-400">{deck.winRate}% victorias</span>
          </div>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>{deck.totalGames} partidas</span>
            <span>{deck.wins} victorias</span>
          </div>
          {deck.players.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Jugadores: {deck.players.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RivalTab({ stats }: { stats: RivalStats[] }) {
  if (stats.length === 0) {
    return <p className="text-gray-400 text-center py-8">No hay estadísticas por rival.</p>
  }

  return (
    <div className="space-y-3">
      {stats.map((rival) => (
        <div key={rival.rivalName} className="bg-gray-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-white">{rival.rivalName}</span>
            <span className="text-sm text-purple-400">{rival.winRate}% victorias</span>
          </div>
          <div className="flex gap-4 text-sm text-gray-400">
            <span>{rival.totalGames} partidas</span>
            <span>{rival.userWins} victorias tuyas</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function LogTab({ entries }: { entries: GameLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-gray-400 text-center py-8">No hay partidas registradas.</p>
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-2">
            {new Date(entry.date).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {entry.players.map((p, pIdx) => (
              <span
                key={pIdx}
                className="text-sm px-2 py-1 rounded bg-gray-700 text-gray-300"
              >
                {p.name}
                {p.deck && <span className="text-purple-400 ml-1">({p.deck})</span>}
                {p.eliminationOrder != null && (
                  <span className="text-red-400 ml-1">#{p.eliminationOrder}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
  small,
}: {
  label: string
  value: string | number
  highlight?: boolean
  small?: boolean
}) {
  return (
    <div className={`bg-gray-800 rounded-lg p-3 text-center ${small ? '' : ''}`}>
      <p className={`font-bold ${small ? 'text-lg' : 'text-2xl'} ${highlight ? 'text-purple-400' : 'text-white'}`}>
        {value}
      </p>
      <p className={`text-gray-400 ${small ? 'text-xs' : 'text-xs'} mt-1`}>{label}</p>
    </div>
  )
}
