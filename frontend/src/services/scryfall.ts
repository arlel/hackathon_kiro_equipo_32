const SCRYFALL_API = 'https://api.scryfall.com'

export interface ScryfallCard {
  id: string
  name: string
  image_uris?: {
    small: string
    normal: string
    art_crop: string
  }
  card_faces?: {
    name: string
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
