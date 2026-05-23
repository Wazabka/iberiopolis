export type Role = 'saboteador' | 'negociador' | 'especulador' | 'asesor' | 'sindicalista' | 'influencer'
export type PropertyGroup = 'startup' | 'servicios' | 'corporacion' | 'monopolio'
export type CardType = 'escandalo' | 'subvencion'
export type GamePhase = 'roll' | 'action' | 'buy' | 'build' | 'negotiate' | 'end'
export type GameStatus = 'waiting' | 'playing' | 'finished'

export interface PropertyDef {
  key: string
  name: string
  group: PropertyGroup
  price: number
  rents: [number, number, number, number]
  buildCosts: [number, number, number]
  position: number
}

export interface SpecialSquare {
  key: string
  name: string
  type: 'salida' | 'juzgado' | 'siesta' | 'hacienda' | 'ere' | 'escandalo' | 'subvencion' | 'inspeccion' | 'ipo' | 'vacaciones' | 'libre'
  position: number
}

export interface Player {
  id: string
  user_id: string
  room_id: string
  username: string
  avatar_url?: string
  role: Role
  color: string
  position: number
  money: number
  sabotage_tokens: number
  offshore_money: number
  hidden_money: boolean
  in_jail: boolean
  jail_turns: number
  is_bankrupt: boolean
  turn_order: number
}

export interface Property {
  id: string
  room_id: string
  property_key: string
  owner_id: string | null
  level: number
  is_blocked: boolean
  blocked_turns: number
  bubble_active: boolean
  bubble_turns: number
  ipo_active: boolean
}

export interface Alliance {
  id: string
  room_id: string
  player_a: string
  player_b: string
  turns_remaining: number
}

export interface Vote {
  id: string
  room_id: string
  initiated_by: string
  proposal: string
  votes: Record<string, boolean>
  status: 'open' | 'passed' | 'failed'
}

export interface GameState {
  id: string
  room_id: string
  current_player_id: string
  current_turn: number
  current_round: number
  phase: GamePhase
  dice_result: number[]
  last_event: any
  corralito_active: boolean
  corralito_turns: number
  huelga_transportes: boolean
  ipc_bonus: boolean
  log: LogEntry[]
}

export interface LogEntry {
  turn: number
  player: string
  action: string
  detail?: string
  timestamp: string
}

export interface CardDef {
  key: string
  name: string
  type: CardType
  subtype?: 'ofensiva' | 'neutral' | 'beneficiosa' | 'caos' | 'subvencion'
  storable: boolean
  description: string
}

export interface Room {
  id: string
  code: string
  host_id: string
  status: GameStatus
  max_players: number
}