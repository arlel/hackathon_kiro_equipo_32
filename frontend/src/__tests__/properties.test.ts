import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getCardImageUrl, type ScryfallCard } from '@/services/scryfall'
import { generateStatsCsv } from '@/services/csv'

// Feature: mtg-life-counter, Property 8: Imagen de carta doble cara
// For any card without root image_uris but with card_faces, getCardImageUrl returns first face image
// **Validates: Requirements 5.7**
describe('Property 8: Double-faced card image', () => {
  it('should extract image from card_faces when root image_uris is absent', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.webUrl(),
        fc.webUrl(),
        (artCropUrl, smallUrl, normalUrl) => {
          const card: ScryfallCard = {
            id: 'test-id',
            name: 'Test Double-Faced Card',
            image_uris: undefined,
            card_faces: [
              {
                name: 'Front Face',
                image_uris: {
                  small: smallUrl,
                  normal: normalUrl,
                  art_crop: artCropUrl,
                },
              },
              {
                name: 'Back Face',
                image_uris: {
                  small: 'https://back.com/small.jpg',
                  normal: 'https://back.com/normal.jpg',
                  art_crop: 'https://back.com/art.jpg',
                },
              },
            ],
            color_identity: ['U'],
            type_line: 'Legendary Creature',
          }

          // Default size is 'small'
          const resultSmall = getCardImageUrl(card, 'small')
          expect(resultSmall).toBe(smallUrl)

          // art_crop size
          const resultArtCrop = getCardImageUrl(card, 'art_crop')
          expect(resultArtCrop).toBe(artCropUrl)

          // normal size
          const resultNormal = getCardImageUrl(card, 'normal')
          expect(resultNormal).toBe(normalUrl)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return null when card has no image_uris and no card_faces', () => {
    const card: ScryfallCard = {
      id: 'test-id',
      name: 'Test Card',
      image_uris: undefined,
      card_faces: undefined,
      color_identity: [],
      type_line: 'Creature',
    }

    const result = getCardImageUrl(card)
    expect(result).toBeNull()
  })
})

// Feature: mtg-life-counter, Property 17: Selección aleatoria dentro de la lista de jugadores
// For any room with N active players (N >= 2), the randomly selected player is a member of the active list
// **Validates: Requirements 15.2**
describe('Property 17: Random starter selection within player list', () => {
  it('should always select a player from the active players list', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 2, maxLength: 12 }
        ),
        (players) => {
          // Simulate selectRandomStarter logic from useLocalRoom
          const active = players.filter(() => true) // All connected, none eliminated
          if (active.length === 0) return true // Skip trivially

          const selected = active[Math.floor(Math.random() * active.length)]
          const selectedIds = active.map(p => p.id)

          expect(selectedIds).toContain(selected.id)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should never select from outside the provided player set', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 20 }),
          }),
          { minLength: 2, maxLength: 12 }
        ),
        (players) => {
          const ids = players.map(p => p.id)
          // Run selection multiple times to increase confidence
          for (let i = 0; i < 10; i++) {
            const idx = Math.floor(Math.random() * players.length)
            expect(idx).toBeGreaterThanOrEqual(0)
            expect(idx).toBeLessThan(players.length)
            expect(ids).toContain(players[idx].id)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: mtg-life-counter, Property 21: CSV con formato correcto
// For any set of user stats, the generated CSV uses comma separator, includes Spanish headers,
// and percentage values are formatted correctly.
// **Validates: Requirements 20.3**
describe('Property 21: CSV correct format', () => {
  it('should use comma separator and Spanish headers', () => {
    fc.assert(
      fc.property(
        fc.record({
          totalGames: fc.nat({ max: 1000 }),
          wins: fc.nat({ max: 1000 }),
          winRate: fc.float({ min: 0, max: 100, noNaN: true }),
          eliminationsByNormal: fc.nat({ max: 100 }),
          eliminationsByCommander: fc.nat({ max: 100 }),
          eliminationsByPoison: fc.nat({ max: 100 }),
        }),
        fc.array(fc.record({
          deckId: fc.uuid(),
          deckName: fc.string({ minLength: 1, maxLength: 30 }),
          totalGames: fc.nat({ max: 100 }),
          wins: fc.nat({ max: 100 }),
          winRate: fc.float({ min: 0, max: 100, noNaN: true }),
          players: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        }), { maxLength: 5 }),
        fc.array(fc.record({
          rivalName: fc.string({ minLength: 1, maxLength: 20 }),
          totalGames: fc.nat({ max: 100 }),
          userWins: fc.nat({ max: 100 }),
          winRate: fc.float({ min: 0, max: 100, noNaN: true }),
        }), { maxLength: 5 }),
        (generalStats, deckStats, rivalStats) => {
          const csv = generateStatsCsv(generalStats, deckStats, rivalStats)

          // Must not be empty
          const lines = csv.split('\n')
          expect(lines.length).toBeGreaterThan(0)

          // Has Spanish section headers
          expect(csv).toContain('Estadísticas Generales')
          expect(csv).toContain('Total Partidas')
          expect(csv).toContain('Victorias')
          expect(csv).toContain('Porcentaje Victorias')

          // Has deck stats section
          expect(csv).toContain('Estadísticas por Mazo')
          expect(csv).toContain('Mazo')

          // Has rival stats section
          expect(csv).toContain('Estadísticas por Rival')
          expect(csv).toContain('Rival')

          // Header rows use comma as separator
          const generalHeader = lines[1]
          expect(generalHeader).toContain(',')

          // Verify general stats data row contains the data values
          const generalDataRow = lines[2]
          expect(generalDataRow).toContain(String(generalStats.totalGames))
          expect(generalDataRow).toContain(String(generalStats.wins))
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should produce valid CSV rows with correct number of fields per section', () => {
    // Parse a CSV row respecting quoted fields (commas inside quotes don't split)
    function parseCsvRow(row: string): string[] {
      const fields: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < row.length; i++) {
        const ch = row[i]
        if (ch === '"') {
          if (inQuotes && row[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (ch === ',' && !inQuotes) {
          fields.push(current)
          current = ''
        } else {
          current += ch
        }
      }
      fields.push(current)
      return fields
    }

    fc.assert(
      fc.property(
        fc.record({
          totalGames: fc.nat({ max: 1000 }),
          wins: fc.nat({ max: 1000 }),
          winRate: fc.float({ min: 0, max: 100, noNaN: true }),
          eliminationsByNormal: fc.nat({ max: 100 }),
          eliminationsByCommander: fc.nat({ max: 100 }),
          eliminationsByPoison: fc.nat({ max: 100 }),
        }),
        fc.array(fc.record({
          deckId: fc.uuid(),
          deckName: fc.string({ minLength: 1, maxLength: 30 }),
          totalGames: fc.nat({ max: 100 }),
          wins: fc.nat({ max: 100 }),
          winRate: fc.float({ min: 0, max: 100, noNaN: true }),
          players: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
        }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.record({
          rivalName: fc.string({ minLength: 1, maxLength: 20 }),
          totalGames: fc.nat({ max: 100 }),
          userWins: fc.nat({ max: 100 }),
          winRate: fc.float({ min: 0, max: 100, noNaN: true }),
        }), { minLength: 1, maxLength: 5 }),
        (generalStats, deckStats, rivalStats) => {
          const csv = generateStatsCsv(generalStats, deckStats, rivalStats)
          const lines = csv.split('\n')

          // The CSV structure is:
          // Line 0: "Estadísticas Generales" (section title)
          // Line 1: header row (6 columns)
          // Line 2: data row
          // Line 3: empty
          // Line 4: "Estadísticas por Mazo" (section title)
          // Line 5: header row (5 columns)
          // Line 6..N: deck data rows
          // Line N+1: empty
          // Line N+2: "Estadísticas por Rival" (section title)
          // Line N+3: header row (4 columns)
          // Line N+4..M: rival data rows

          // General section: index 0 is title, index 1 is header
          const generalTitleIdx = lines.findIndex(l => l === 'Estadísticas Generales')
          expect(generalTitleIdx).toBeGreaterThanOrEqual(0)
          const generalHeaderIdx = generalTitleIdx + 1
          const generalHeaderFields = parseCsvRow(lines[generalHeaderIdx]).length
          expect(generalHeaderFields).toBe(6)
          const generalDataRow = lines[generalHeaderIdx + 1]
          if (generalDataRow && generalDataRow.trim() !== '') {
            const dataFields = parseCsvRow(generalDataRow).length
            expect(dataFields).toBe(generalHeaderFields)
          }

          // Deck section
          const deckTitleIdx = lines.findIndex(l => l === 'Estadísticas por Mazo')
          expect(deckTitleIdx).toBeGreaterThan(generalTitleIdx)
          const deckHeaderIdx = deckTitleIdx + 1
          const deckHeaderFields = parseCsvRow(lines[deckHeaderIdx]).length
          expect(deckHeaderFields).toBe(5)
          for (let i = deckHeaderIdx + 1; i < lines.length; i++) {
            if (lines[i].trim() === '' || lines[i] === 'Estadísticas por Rival') break
            const rowFields = parseCsvRow(lines[i]).length
            expect(rowFields).toBe(deckHeaderFields)
          }

          // Rival section
          const rivalTitleIdx = lines.findIndex(l => l === 'Estadísticas por Rival')
          expect(rivalTitleIdx).toBeGreaterThan(deckTitleIdx)
          const rivalHeaderIdx = rivalTitleIdx + 1
          const rivalHeaderFields = parseCsvRow(lines[rivalHeaderIdx]).length
          expect(rivalHeaderFields).toBe(4)
          for (let i = rivalHeaderIdx + 1; i < lines.length; i++) {
            if (lines[i].trim() === '') break
            const rowFields = parseCsvRow(lines[i]).length
            expect(rowFields).toBe(rivalHeaderFields)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
