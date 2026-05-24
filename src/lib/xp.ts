export interface PlayerStats {
  id: string
  user_id: string
  username: string
  level: number
  xp: number
  xp_to_next: number
  title: string
  games_played: number
  games_won: number
  total_money_earned: number
  properties_bought: number
  rents_collected: number
  cards_played: number
}

export const TITLES: Record<number, string> = {
  1:  'Becario',
  2:  'Empleado del Mes',
  3:  'Mando Intermedio',
  4:  'Jefe de Área',
  5:  'Director Regional',
  6:  'CEO en Prácticas',
  7:  'Tiburón del IBEX',
  8:  'Magnate Nacional',
  9:  'Oligarca Ibérico',
  10: 'El Amo del Cortijo',
}

export const LEVEL_COLORS: Record<number, string> = {
  1:  '#71717a',
  2:  '#71717a',
  3:  '#3B6D11',
  4:  '#3B6D11',
  5:  '#185FA5',
  6:  '#185FA5',
  7:  '#854F0B',
  8:  '#854F0B',
  9:  '#A32D2D',
  10: '#f59e0b',
}

export const COSMETICS: Record<number, { borderColor: string; glow: string }> = {
  1:  { borderColor: '#71717a', glow: 'none' },
  2:  { borderColor: '#71717a', glow: 'none' },
  3:  { borderColor: '#3B6D11', glow: '0 0 6px rgba(59,109,17,0.4)' },
  4:  { borderColor: '#3B6D11', glow: '0 0 8px rgba(59,109,17,0.5)' },
  5:  { borderColor: '#185FA5', glow: '0 0 8px rgba(24,95,165,0.5)' },
  6:  { borderColor: '#185FA5', glow: '0 0 10px rgba(24,95,165,0.6)' },
  7:  { borderColor: '#854F0B', glow: '0 0 10px rgba(133,79,11,0.6)' },
  8:  { borderColor: '#854F0B', glow: '0 0 12px rgba(133,79,11,0.7)' },
  9:  { borderColor: '#A32D2D', glow: '0 0 12px rgba(163,45,45,0.7)' },
  10: { borderColor: '#f59e0b', glow: '0 0 16px rgba(245,158,11,0.8)' },
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export function calculateLevel(xp: number): { level: number; xp_to_next: number } {
  let level = 1
  let accumulated = 0
  while (level < 10) {
    const needed = xpForLevel(level)
    if (accumulated + needed > xp) break
    accumulated += needed
    level++
  }
  const xp_to_next = level < 10 ? xpForLevel(level) - (xp - Object.values(Array.from({ length: level - 1 }, (_, i) => xpForLevel(i + 1))).reduce((a: number, b) => a + (b as number), 0)) : 0
  return { level, xp_to_next }
}

export function getTitle(level: number): string {
  return TITLES[Math.min(level, 10)] || 'Becario'
}

// XP rewards
export const XP_REWARDS = {
  game_played:       10,
  game_won:          50,
  property_bought:    3,
  rent_collected:     2,
  card_played:        2,
  alliance_formed:    5,
  alliance_betrayed: -5,
  money_milestone:   20, // per €100k earned
}
