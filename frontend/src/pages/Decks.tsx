import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTranslation } from '@/i18n/I18nContext'
import { listDecks, createDeck, updateDeck, deleteDeck } from '@/services/api'
import CommanderSearch from '@/components/CommanderSearch'
import type { DeckRecord, GameFormat } from '@/types/game'

interface DeckFormData {
  name: string
  format: GameFormat
  commanderName?: string
  commanderImage?: string
  partnerName?: string
  partnerImage?: string
}

export default function Decks() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { t } = useTranslation()
  const [decks, setDecks] = useState<DeckRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<DeckFormData>({ name: '', format: 'commander' })
  const [creating, setCreating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    fetchDecks()
  }, [isAuthenticated, navigate])

  async function fetchDecks() {
    try {
      setLoading(true)
      const data = await listDecks()
      setDecks(data)
    } catch (err) {
      console.error('Error fetching decks:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError(t('decks.nameRequired'))
      return
    }
    setError(null)
    setCreating(true)
    try {
      await createDeck({
        name: formData.name.trim(),
        format: formData.format,
        commander_name: formData.commanderName,
        commander_image: formData.commanderImage,
        partner_name: formData.partnerName,
        partner_image: formData.partnerImage,
      })
      setFormData({ name: '', format: 'commander' })
      setShowForm(false)
      await fetchDecks()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('decks.createError'))
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleStatus(deck: DeckRecord) {
    const newStatus = deck.status === 'active' ? 'inactive' : 'active'
    try {
      await updateDeck(deck.id, { status: newStatus })
      setDecks((prev) =>
        prev.map((d) => (d.id === deck.id ? { ...d, status: newStatus } : d))
      )
    } catch (err) {
      console.error('Error updating deck:', err)
    }
  }

  async function handleDelete(deckId: string) {
    try {
      await deleteDeck(deckId)
      setDecks((prev) => prev.filter((d) => d.id !== deckId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting deck:', err)
    }
  }

  function handleCommanderSelect(
    commander: { name: string; image: string },
    partner?: { name: string; image: string }
  ) {
    setFormData((prev) => ({
      ...prev,
      commanderName: commander.name,
      commanderImage: commander.image,
      partnerName: partner?.name,
      partnerImage: partner?.image,
    }))
  }

  function resetForm() {
    setFormData({ name: '', format: 'commander' })
    setShowForm(false)
    setError(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">{t('decks.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('decks.title')}</h1>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← {t('common.back')}
        </button>
      </div>

      {/* Add deck button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-6 py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
        >
          {t('decks.addDeck')}
        </button>
      )}

      {/* Creation form */}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 bg-gray-900 rounded-xl p-4 space-y-4 border border-gray-800">
          <h2 className="text-lg font-semibold text-white">{t('decks.newDeck')}</h2>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/20 px-3 py-2 rounded">{error}</p>
          )}

          {/* Deck name */}
          <div>
            <label htmlFor="deck-name" className="block text-sm text-gray-400 mb-1">
              {t('decks.nameLabel')}
            </label>
            <input
              id="deck-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('decks.namePlaceholder')}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500"
            />
          </div>

          {/* Format selector */}
          <div>
            <label htmlFor="deck-format" className="block text-sm text-gray-400 mb-1">
              {t('decks.formatLabel')}
            </label>
            <select
              id="deck-format"
              value={formData.format}
              onChange={(e) => {
                const format = e.target.value as GameFormat
                setFormData((prev) => ({
                  ...prev,
                  format,
                  commanderName: undefined,
                  commanderImage: undefined,
                  partnerName: undefined,
                  partnerImage: undefined,
                }))
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="commander">{t('format.commander')}</option>
              <option value="20vida">{t('format.20vida')}</option>
              <option value="custom">{t('format.custom')}</option>
            </select>
          </div>

          {/* Commander search (only for commander format) */}
          {formData.format === 'commander' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('decks.commanderLabel')}</label>
              <CommanderSearch
                value={formData.commanderName || ''}
                onChange={(name) => setFormData((prev) => ({ ...prev, commanderName: name }))}
                onSelect={handleCommanderSelect}
                placeholder={t('decks.searchCommander')}
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium py-2 rounded-lg transition-colors"
            >
              {creating ? t('decks.creating') : t('decks.createDeck')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Deck list */}
      {decks.length === 0 ? (
        <p className="text-gray-400 text-center mt-12">{t('decks.empty')}</p>
      ) : (
        <div className="space-y-3">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className={`bg-gray-900 rounded-xl p-4 border transition-colors ${
                deck.status === 'active' ? 'border-gray-800' : 'border-gray-800/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Deck info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{deck.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        deck.status === 'active'
                          ? 'bg-green-900/50 text-green-400'
                          : 'bg-gray-800 text-gray-500'
                      }`}
                    >
                      {deck.status === 'active' ? t('decks.active') : t('decks.inactive')}
                    </span>
                  </div>

                  {deck.commanderName && (
                    <p className="text-sm text-purple-400 truncate">
                      ⚔️ {deck.commanderName}
                      {deck.partnerName && ` + ${deck.partnerName}`}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="uppercase tracking-wide">{t(`format.${deck.format}`)}</span>
                    <span>{t('decks.gamesSuffix', { count: deck.totalGames })}</span>
                    <span>{t('decks.winsSuffix', { rate: deck.winRate })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle status */}
                  <button
                    onClick={() => handleToggleStatus(deck)}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    title={deck.status === 'active' ? t('decks.deactivate') : t('decks.activate')}
                    aria-label={deck.status === 'active' ? t('decks.deactivateDeck') : t('decks.activateDeck')}
                  >
                    {deck.status === 'active' ? (
                      <span className="text-green-400">⏸</span>
                    ) : (
                      <span className="text-gray-500">▶️</span>
                    )}
                  </button>

                  {/* Delete */}
                  {deleteConfirm === deck.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(deck.id)}
                        className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded hover:bg-red-900 transition-colors"
                      >
                        {t('decks.confirm')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2 py-1 text-gray-500 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(deck.id)}
                      className="p-2 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
                      title={t('decks.deleteDeck')}
                      aria-label={t('decks.deleteDeck')}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
