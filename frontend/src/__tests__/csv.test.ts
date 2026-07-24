import { describe, it, expect } from 'vitest'
import { generateStatsCsv } from '@/services/csv'
import type { GeneralStats, DeckStats, RivalStats } from '@/types/game'

describe('generateStatsCsv', () => {
  const baseGeneralStats: GeneralStats = {
    totalGames: 50,
    wins: 20,
    winRate: 40,
    eliminationsByNormal: 10,
    eliminationsByCommander: 5,
    eliminationsByPoison: 3,
  }

  const baseDeckStats: DeckStats[] = [
    {
      deckId: 'deck-1',
      deckName: 'Atraxa Infect',
      totalGames: 15,
      wins: 8,
      winRate: 53,
      players: ['Alice', 'Bob'],
    },
  ]

  const baseRivalStats: RivalStats[] = [
    {
      rivalName: 'Carlos',
      totalGames: 10,
      userWins: 6,
      winRate: 60,
    },
  ]

  it('produces output with Spanish section headers', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)

    expect(csv).toContain('Estadísticas Generales')
    expect(csv).toContain('Estadísticas por Mazo')
    expect(csv).toContain('Estadísticas por Rival')
  })

  it('uses comma as separator between columns', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)
    const lines = csv.split('\n')

    // Header row for general stats (second line)
    const generalHeader = lines[1]
    expect(generalHeader).toContain(',')
    // Should have 6 columns → 5 commas
    expect(generalHeader.split(',').length).toBe(6)
  })

  it('produces correct Spanish column headers for general stats', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)
    const lines = csv.split('\n')

    const generalHeader = lines[1]
    expect(generalHeader).toContain('Total Partidas')
    expect(generalHeader).toContain('Victorias')
    expect(generalHeader).toContain('Porcentaje Victorias')
    expect(generalHeader).toContain('Eliminaciones Daño Normal')
    expect(generalHeader).toContain('Eliminaciones Daño Comandante')
    expect(generalHeader).toContain('Eliminaciones Veneno')
  })

  it('produces correct Spanish column headers for deck stats', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)
    const lines = csv.split('\n')

    // Find the deck section header line
    const deckSectionIndex = lines.indexOf('Estadísticas por Mazo')
    const deckHeader = lines[deckSectionIndex + 1]
    expect(deckHeader).toContain('Mazo')
    expect(deckHeader).toContain('Total Partidas')
    expect(deckHeader).toContain('Victorias')
    expect(deckHeader).toContain('Porcentaje Victorias')
    expect(deckHeader).toContain('Jugadores')
  })

  it('produces correct Spanish column headers for rival stats', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)
    const lines = csv.split('\n')

    const rivalSectionIndex = lines.indexOf('Estadísticas por Rival')
    const rivalHeader = lines[rivalSectionIndex + 1]
    expect(rivalHeader).toContain('Rival')
    expect(rivalHeader).toContain('Total Partidas')
    expect(rivalHeader).toContain('Victorias Usuario')
    expect(rivalHeader).toContain('Porcentaje Victorias')
  })

  it('includes correct data values for general stats', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)
    const lines = csv.split('\n')

    const dataRow = lines[2]
    const values = dataRow.split(',')
    expect(values[0]).toBe('50')
    expect(values[1]).toBe('20')
    expect(values[2]).toBe('40')
    expect(values[3]).toBe('10')
    expect(values[4]).toBe('5')
    expect(values[5]).toBe('3')
  })

  it('separates sections with blank lines', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)
    const lines = csv.split('\n')

    // After general stats data there should be an empty line
    expect(lines[3]).toBe('')
    // After deck stats there should be an empty line before rival stats
    const rivalIndex = lines.indexOf('Estadísticas por Rival')
    expect(lines[rivalIndex - 1]).toBe('')
  })

  it('escapes values containing commas', () => {
    const deckWithComma: DeckStats[] = [
      {
        deckId: 'deck-2',
        deckName: 'Korvold, Fae-Cursed King',
        totalGames: 5,
        wins: 3,
        winRate: 60,
        players: ['Alice'],
      },
    ]

    const csv = generateStatsCsv(baseGeneralStats, deckWithComma, baseRivalStats)
    // The deck name with comma should be wrapped in quotes
    expect(csv).toContain('"Korvold, Fae-Cursed King"')
  })

  it('escapes values containing double quotes', () => {
    const rivalWithQuotes: RivalStats[] = [
      {
        rivalName: 'El "Maestro"',
        totalGames: 3,
        userWins: 1,
        winRate: 33,
      },
    ]

    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, rivalWithQuotes)
    // Double quotes within values should be escaped as ""
    expect(csv).toContain('"El ""Maestro"""')
  })

  it('joins multiple players with semicolons in deck stats', () => {
    const csv = generateStatsCsv(baseGeneralStats, baseDeckStats, baseRivalStats)
    // Players are joined with '; '
    expect(csv).toContain('Alice; Bob')
  })

  it('handles empty deck and rival stats arrays', () => {
    const csv = generateStatsCsv(baseGeneralStats, [], [])
    const lines = csv.split('\n')

    // Should still have all 3 section headers
    expect(csv).toContain('Estadísticas Generales')
    expect(csv).toContain('Estadísticas por Mazo')
    expect(csv).toContain('Estadísticas por Rival')

    // Should not throw and should produce valid structure
    expect(lines.length).toBeGreaterThan(0)
  })
})
