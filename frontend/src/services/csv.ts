import type { GeneralStats, DeckStats, RivalStats } from '@/types/game'

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatRow(values: string[]): string {
  return values.map(escapeCsvValue).join(',')
}

export function generateStatsCsv(
  generalStats: GeneralStats,
  deckStats: DeckStats[],
  rivalStats: RivalStats[],
): string {
  const lines: string[] = []

  // Section: Estadísticas Generales
  lines.push('Estadísticas Generales')
  lines.push(formatRow(['Total Partidas', 'Victorias', 'Porcentaje Victorias', 'Eliminaciones Daño Normal', 'Eliminaciones Daño Comandante', 'Eliminaciones Veneno']))
  lines.push(formatRow([
    String(generalStats.totalGames),
    String(generalStats.wins),
    String(generalStats.winRate),
    String(generalStats.eliminationsByNormal),
    String(generalStats.eliminationsByCommander),
    String(generalStats.eliminationsByPoison),
  ]))
  lines.push('')

  // Section: Estadísticas por Mazo
  lines.push('Estadísticas por Mazo')
  lines.push(formatRow(['Mazo', 'Total Partidas', 'Victorias', 'Porcentaje Victorias', 'Jugadores']))
  for (const deck of deckStats) {
    lines.push(formatRow([
      deck.deckName,
      String(deck.totalGames),
      String(deck.wins),
      String(deck.winRate),
      deck.players.join('; '),
    ]))
  }
  lines.push('')

  // Section: Estadísticas por Rival
  lines.push('Estadísticas por Rival')
  lines.push(formatRow(['Rival', 'Total Partidas', 'Victorias Usuario', 'Porcentaje Victorias']))
  for (const rival of rivalStats) {
    lines.push(formatRow([
      rival.rivalName,
      String(rival.totalGames),
      String(rival.userWins),
      String(rival.winRate),
    ]))
  }

  return lines.join('\n')
}

export function downloadCsv(content: string, username: string): void {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `estadisticas_${username}_${dateStr}.csv`

  // Add BOM for UTF-8 encoding detection
  const bom = '\uFEFF'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
