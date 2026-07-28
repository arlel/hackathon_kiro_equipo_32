const SCRYFALL_API = 'https://api.scryfall.com'

export interface ScryfallCard {
  id: string
  name: string
  oracle_text?: string
  image_uris?: {
    small: string
    normal: string
    art_crop: string
  }
  card_faces?: {
    name: string
    oracle_text?: string
    image_uris?: {
      small: string
      normal: string
      art_crop: string
    }
  }[]
  color_identity: string[]
  type_line: string
}

interface ScryfallSearchResponse {
  object: string
  total_cards: number
  data: ScryfallCard[]
}

/**
 * Search for valid commanders using Scryfall's search API.
 * Uses `is:commander` to only return cards that are legal as commanders.
 */
export async function searchCommanders(query: string): Promise<ScryfallCard[]> {
  if (query.length < 2) return []

  const searchQuery = encodeURIComponent(`${query} is:commander`)
  const url = `${SCRYFALL_API}/cards/search?q=${searchQuery}&order=name&unique=cards`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      // Scryfall returns 404 when no results found
      if (res.status === 404) return []
      throw new Error(`Scryfall API error: ${res.status}`)
    }

    const data: ScryfallSearchResponse = await res.json()
    return data.data.slice(0, 20) // Limit to 20 results
  } catch (error) {
    console.error('Scryfall search error:', error)
    return []
  }
}

/**
 * Resolve a commander's art-crop image URL from its name via Scryfall.
 * Prefers an exact name match, falling back to the first result.
 * Returns '' when the name is empty or nothing is found.
 */
export async function resolveCommanderArt(name: string): Promise<string> {
  if (!name) return ''
  const results = await searchCommanders(name)
  const card = results.find((c) => c.name === name) || results[0]
  return card ? getCardImageUrl(card, 'art_crop') || '' : ''
}

/**
 * Get the image URL for a card, handling double-faced cards.
 */
export function getCardImageUrl(card: ScryfallCard, size: 'small' | 'normal' | 'art_crop' = 'small'): string | null {
  if (card.image_uris) {
    return card.image_uris[size]
  }
  // Double-faced cards have images in card_faces
  if (card.card_faces && card.card_faces[0]?.image_uris) {
    return card.card_faces[0].image_uris[size]
  }
  return null
}

/**
 * Check if a card has the "Partner" keyword ability.
 * Checks both top-level oracle_text and card_faces for double-faced cards.
 */
export function hasPartnerAbility(card: ScryfallCard): boolean {
  const oracleText = card.oracle_text
    || card.card_faces?.[0]?.oracle_text
    || ''
  return /\bpartner\b/i.test(oracleText)
}

/**
 * Get color identity as display colors.
 */
export function getColorDisplay(colors: string[]): string {
  const colorMap: Record<string, string> = {
    W: '⚪', // White
    U: '🔵', // Blue
    B: '⚫', // Black
    R: '🔴', // Red
    G: '🟢', // Green
  }
  if (colors.length === 0) return '⬜' // Colorless
  return colors.map((c) => colorMap[c] || c).join('')
}

/**
 * Fetch unique art variants of a card by exact name.
 * Uses unique:art to only get one result per distinct illustration.
 */
export async function getCardArtVariants(cardName: string): Promise<{ id: string; artCrop: string; setName: string }[]> {
  if (!cardName) return []

  const query = encodeURIComponent(`!"${cardName}" unique:art`)
  const url = `${SCRYFALL_API}/cards/search?q=${query}&order=released&dir=desc`

  try {
    const res = await fetch(url)
    if (!res.ok) return []

    const data: ScryfallSearchResponse = await res.json()
    const variants: { id: string; artCrop: string; setName: string }[] = []

    for (const card of data.data) {
      const artCrop = getCardImageUrl(card, 'art_crop')
      if (artCrop) {
        variants.push({
          id: card.id,
          artCrop,
          setName: (card as unknown as { set_name?: string }).set_name || '',
        })
      }
    }

    return variants
  } catch (error) {
    console.error('Scryfall art variants error:', error)
    return []
  }
}
