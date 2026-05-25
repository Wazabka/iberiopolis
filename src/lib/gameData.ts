import { Player, Property, PropertyDef, SpecialSquare, CardDef } from '@/types/game'

export const PROPERTIES: PropertyDef[] = [
  // STARTUP (6 props) — posiciones 1,2,4,6,8,10
  { key: 'glovo',      name: 'Glovo',     group: 'startup', price: 35000,  rents: [1800,4500,11000,22000],   buildCosts: [18000,36000,70000],  position: 1 },
  { key: 'cabify',     name: 'Cabify',    group: 'startup', price: 35000,  rents: [1800,4500,11000,22000],   buildCosts: [18000,36000,70000],  position: 2 },
  { key: 'idealista',  name: 'Idealista', group: 'startup', price: 55000,  rents: [2800,6500,15000,30000],   buildCosts: [22000,44000,85000],  position: 4 },
  { key: 'wallapop',   name: 'Wallapop',  group: 'startup', price: 55000,  rents: [2800,6500,15000,30000],   buildCosts: [22000,44000,85000],  position: 6 },
  { key: 'tuotempo',   name: 'TuOtempo',  group: 'startup', price: 70000,  rents: [3500,8000,18000,36000],   buildCosts: [25000,50000,95000],  position: 8 },
  { key: 'amenitiz',   name: 'Amenitiz',  group: 'startup', price: 70000,  rents: [3500,8000,18000,36000],   buildCosts: [25000,50000,95000],  position: 10 },

  // SERVICIOS (6 props) — posiciones 13,15,17,19,21,23
  { key: 'elcorteingles', name: 'El Corte Inglés', group: 'servicios', price: 110000, rents: [7000,16000,32000,58000],  buildCosts: [45000,90000,165000], position: 13 },
  { key: 'bbva',          name: 'BBVA',             group: 'servicios', price: 125000, rents: [8500,19000,36000,65000],  buildCosts: [50000,100000,180000],position: 15 },
  { key: 'santander',     name: 'Santander',        group: 'servicios', price: 135000, rents: [9500,21000,40000,72000],  buildCosts: [50000,100000,180000],position: 17 },
  { key: 'mapfre',        name: 'Mapfre',           group: 'servicios', price: 145000, rents: [10500,23000,44000,78000], buildCosts: [55000,110000,195000],position: 19 },
  { key: 'caixabank',     name: 'CaixaBank',        group: 'servicios', price: 155000, rents: [11500,25000,48000,84000], buildCosts: [55000,110000,195000],position: 21 },
  { key: 'aena',          name: 'Aena',             group: 'servicios', price: 165000, rents: [12500,27000,52000,90000], buildCosts: [60000,120000,210000],position: 23 },

  // CORPORACION (6 props) — posiciones 26,28,30,32,34,36
  { key: 'iberia',    name: 'Iberia',    group: 'corporacion', price: 195000, rents: [15000,32000,62000,105000], buildCosts: [85000,155000,270000], position: 26 },
  { key: 'repsol',    name: 'Repsol',    group: 'corporacion', price: 215000, rents: [17000,36000,68000,115000], buildCosts: [90000,160000,280000], position: 28 },
  { key: 'endesa',    name: 'Endesa',    group: 'corporacion', price: 235000, rents: [19000,40000,76000,128000], buildCosts: [90000,165000,285000], position: 30 },
  { key: 'acs',       name: 'ACS',       group: 'corporacion', price: 255000, rents: [21000,44000,84000,140000], buildCosts: [95000,170000,295000], position: 32 },
  { key: 'ferrovial', name: 'Ferrovial', group: 'corporacion', price: 270000, rents: [23000,48000,92000,155000], buildCosts: [100000,175000,305000],position: 34 },
  { key: 'naturgy',   name: 'Naturgy',   group: 'corporacion', price: 280000, rents: [24000,50000,96000,160000], buildCosts: [100000,180000,310000],position: 36 },

  // MONOPOLIO (6 props) — posiciones 39,41,43,45,47,49 → ajustamos a 39,41,43,45,47,49
  // En tablero 48 casillas: 0-47, monopolios en 39,41,43,45,46,47
  { key: 'inditex',      name: 'Inditex',        group: 'monopolio', price: 295000, rents: [27000,55000,105000,175000], buildCosts: [125000,215000,370000],position: 39 },
  { key: 'mercadona',    name: 'Mercadona',       group: 'monopolio', price: 315000, rents: [29000,60000,115000,190000], buildCosts: [130000,220000,380000],position: 41 },
  { key: 'telefonica',   name: 'Telefónica',      group: 'monopolio', price: 345000, rents: [33000,68000,128000,210000], buildCosts: [135000,230000,395000],position: 43 },
  { key: 'santanderbbva',name: 'Santander+BBVA',  group: 'monopolio', price: 380000, rents: [38000,76000,145000,235000], buildCosts: [140000,240000,410000],position: 45 },
  { key: 'amadeus',      name: 'Amadeus IT',      group: 'monopolio', price: 420000, rents: [44000,88000,168000,270000], buildCosts: [150000,260000,440000],position: 46 },
  { key: 'inditexfull',  name: 'Zara Global',     group: 'monopolio', price: 460000, rents: [50000,100000,190000,305000],buildCosts: [160000,280000,470000],position: 47 },
]

export const PROPERTY_GROUPS: Record<string, string[]> = {
  startup:     ['glovo','cabify','idealista','wallapop','tuotempo','amenitiz'],
  servicios:   ['elcorteingles','bbva','santander','mapfre','caixabank','aena'],
  corporacion: ['iberia','repsol','endesa','acs','ferrovial','naturgy'],
  monopolio:   ['inditex','mercadona','telefonica','santanderbbva','amadeus','inditexfull'],
}

// 48 total squares: 0-47
// Corners: 0=Salida, 12=Juzgado, 24=Siesta Libre, 36=Vacaciones (wait, we need to recalculate)
// Let's use: 0=Salida, 11=Juzgado, 22=Libre, 33=Vacaciones — 4 corners, 11 squares per side (including corners)
// Side length: 12 squares per side (corners included) = 4 × 11 non-corner + 4 corners = 48 total ✓
// Corners: pos 0, 12, 24, 36
// Bottom: 1-11 (11 squares), Right: 13-23 (11 squares), Top: 25-35 (11 squares), Left: 37-47 (11 squares)

export const SPECIAL_SQUARES: SpecialSquare[] = [
  // Corners
  { key: 'salida',     name: 'Salida',             type: 'salida',     position: 0  },
  { key: 'juzgado',    name: 'Juzgado de lo Social',type: 'juzgado',    position: 12 },
  { key: 'libre',      name: 'Siesta Libre',        type: 'libre',      position: 24 },
  { key: 'vacaciones', name: 'Vacaciones en Ibiza', type: 'vacaciones', position: 36 },

  // Bottom row (1-11): startups + specials
  { key: 'escandalo1', name: 'Escándalo Nacional',  type: 'escandalo',  position: 3  },
  { key: 'hacienda1',  name: 'Hacienda Somos Todos',type: 'hacienda',   position: 5  },
  { key: 'siesta1',    name: 'Siesta Nacional',      type: 'siesta',     position: 7  },
  { key: 'subvencion1',name: 'Subvención UE',        type: 'subvencion', position: 9  },
  { key: 'escandalo2', name: 'Escándalo Nacional',   type: 'escandalo',  position: 11 },

  // Right col (13-23): servicios + specials
  { key: 'escandalo3', name: 'Escándalo Nacional',   type: 'escandalo',  position: 14 },
  { key: 'ere',        name: 'ERE Express',           type: 'ere',        position: 16 },
  { key: 'inspeccion1',name: 'Inspección Laboral',   type: 'inspeccion', position: 18 },
  { key: 'subvencion2',name: 'Subvención PYME',       type: 'subvencion', position: 20 },
  { key: 'escandalo4', name: 'Escándalo Nacional',   type: 'escandalo',  position: 22 },

  // Top row (25-35): corporaciones + specials
  { key: 'escandalo5', name: 'Escándalo Nacional',   type: 'escandalo',  position: 25 },
  { key: 'hacienda2',  name: 'Hacienda Somos Todos', type: 'hacienda',   position: 27 },
  { key: 'boom',       name: 'Boom Turístico',        type: 'subvencion', position: 29 },
  { key: 'inspeccion2',name: 'Inspección Laboral',   type: 'inspeccion', position: 31 },
  { key: 'ipo',        name: 'IPO en Bolsa',          type: 'ipo',        position: 33 },
  { key: 'escandalo6', name: 'Escándalo Nacional',   type: 'escandalo',  position: 35 },

  // Left col (37-47): monopolios + specials
  { key: 'escandalo7', name: 'Escándalo Nacional',   type: 'escandalo',  position: 37 },
  { key: 'subvencion3',name: 'Digitalización',        type: 'subvencion', position: 38 },
  { key: 'escandalo8', name: 'Escándalo Nacional',   type: 'escandalo',  position: 40 },
  { key: 'crack',      name: 'Crack del 29',          type: 'escandalo',  position: 42 },
  { key: 'escandalo9', name: 'Escándalo Nacional',   type: 'escandalo',  position: 44 },
]

export const TOTAL_SQUARES = 48

export const PIECE_TYPES = [
  { key: 'corona',    name: 'Corona',    emoji: '👑' },
  { key: 'cohete',    name: 'Cohete',    emoji: '🚀' },
  { key: 'maletin',   name: 'Maletín',   emoji: '💼' },
  { key: 'sombrero',  name: 'Sombrero',  emoji: '🎩' },
  { key: 'barco',     name: 'Barco',     emoji: '⛵' },
  { key: 'trofeo',    name: 'Trofeo',    emoji: '🏆' },
  { key: 'diamante',  name: 'Diamante',  emoji: '💎' },
  { key: 'rayo',      name: 'Rayo',      emoji: '⚡' },
]

export const ESCANDALO_CARDS: CardDef[] = [
  { key: 'filtraciones',       name: 'Filtraciones a la prensa',   type: 'escandalo', subtype: 'ofensiva',    storable: false, description: 'Elige a un rival. Debe revelar todo su dinero y cartas en mano.' },
  { key: 'inspeccion_hacienda',name: 'Inspección de Hacienda',     type: 'escandalo', subtype: 'ofensiva',    storable: false, description: 'El rival con más propiedades paga el 20% de su efectivo al banco.' },
  { key: 'expediente',         name: 'Expediente de regulación',   type: 'escandalo', subtype: 'ofensiva',    storable: false, description: 'Elige una propiedad rival. No genera renta 2 rondas.' },
  { key: 'opa_hostil',         name: 'OPA hostil',                 type: 'escandalo', subtype: 'ofensiva',    storable: true,  description: 'Obliga a un rival a venderte una propiedad al precio original.' },
  { key: 'demanda_colectiva',  name: 'Demanda colectiva',          type: 'escandalo', subtype: 'ofensiva',    storable: false, description: 'El más votado no puede construir mejoras durante 2 rondas.' },
  { key: 'cartel',             name: 'Cártel empresarial',         type: 'escandalo', subtype: 'ofensiva',    storable: false, description: 'Rompe cualquier alianza activa. Ambos pagan €30.000.' },
  { key: 'crisis_suministro',  name: 'Crisis de suministro',       type: 'escandalo', subtype: 'neutral',     storable: false, description: 'Nadie puede construir mejoras esta ronda.' },
  { key: 'subida_ipc',         name: 'Subida del IPC',             type: 'escandalo', subtype: 'neutral',     storable: false, description: 'Todas las rentas de esta ronda +15%.' },
  { key: 'elecciones',         name: 'Elecciones generales',       type: 'escandalo', subtype: 'neutral',     storable: false, description: 'El jugador elegido por votación decide el orden de turno.' },
  { key: 'fusion_bancaria',    name: 'Fusión bancaria',            type: 'escandalo', subtype: 'neutral',     storable: false, description: 'Los 2 jugadores con menos dinero intercambian una propiedad.' },
  { key: 'apagon_digital',     name: 'Apagón digital',             type: 'escandalo', subtype: 'neutral',     storable: false, description: 'Startups sin renta esta ronda. Sus dueños cobran €10.000.' },
  { key: 'huelga_transportes', name: 'Huelga de transportes',      type: 'escandalo', subtype: 'neutral',     storable: false, description: 'Esta ronda nadie puede moverse más de 6 casillas.' },
  { key: 'obra_publica',       name: 'Contrato de obra pública',   type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'Construye una mejora gratis en cualquier propiedad tuya.' },
  { key: 'bono_social',        name: 'Bono social del gobierno',   type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'El jugador con menos patrimonio cobra €50.000 del banco.' },
  { key: 'indulto',            name: 'Indulto político',           type: 'escandalo', subtype: 'beneficiosa', storable: true,  description: 'Sales del Juzgado gratis. Guárdala si no la necesitas.' },
  { key: 'subvencion_ue',      name: 'Subvención europea',         type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'Cobras €40.000 del banco sin condiciones.' },
  { key: 'boom_turistico',     name: 'Boom turístico',             type: 'escandalo', subtype: 'beneficiosa', storable: true,  description: 'Todas tus propiedades generan el doble de renta esta ronda.' },
  { key: 'ipo_bolsa',          name: 'IPO en Bolsa',               type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'Una propiedad tuya sube un 40% su valor de venta.' },
  { key: 'apagon_regulatorio', name: 'Apagón regulatorio',         type: 'escandalo', subtype: 'caos',        storable: false, description: 'Todas las pasivas de rol quedan desactivadas esta ronda.' },
  { key: 'gran_redistribucion',name: 'Gran redistribución',        type: 'escandalo', subtype: 'caos',        storable: false, description: 'Todo el efectivo al centro, se reparte a partes iguales.' },
  { key: 'rotacion_activos',   name: 'Rotación de activos',        type: 'escandalo', subtype: 'caos',        storable: false, description: 'Cada jugador cede su propiedad más barata al de su izquierda.' },
  { key: 'crack_29',           name: 'Crack del 29',               type: 'escandalo', subtype: 'caos',        storable: false, description: 'El jugador con más patrimonio pierde el 25% de su efectivo.' },
  { key: 'intervencion_estado',name: 'Intervención del Estado',    type: 'escandalo', subtype: 'caos',        storable: false, description: 'El jugador con más propiedades cede una al banco para subasta.' },
  { key: 'corralito',          name: 'Corralito',                  type: 'escandalo', subtype: 'caos',        storable: false, description: 'Durante 2 rondas, nadie puede gastar más de €30.000 por turno.' },
]

export const SUBVENCION_CARDS: CardDef[] = [
  { key: 'fondo_cohesion',       name: 'Fondo de cohesión',          type: 'subvencion', storable: false, description: 'Cobras €35.000 del banco sin condiciones.' },
  { key: 'plan_renove',          name: 'Plan Renove empresarial',     type: 'subvencion', storable: false, description: 'Degrada una mejora y recupera el 90% del coste.' },
  { key: 'incentivo_contratacion',name: 'Incentivo a la contratación',type: 'subvencion', storable: false, description: 'Tu próxima compra tiene un 15% de descuento.' },
  { key: 'digitalizacion_pyme',  name: 'Digitalización PYME',        type: 'subvencion', storable: false, description: 'Cobras €20.000 por cada Startup que poseas (máx €120.000).' },
  { key: 'credito_ico',          name: 'Crédito ICO',                 type: 'subvencion', storable: true,  description: 'El banco cubre cualquier pago que te caiga, hasta €80.000.' },
]

export const ROLES_DEF = {
  saboteador: {
    name: 'El Saboteador',
    passive: 'Tus propiedades son inmunes a bloqueos. Tienes 3 fichas de sabotaje.',
    active: 'Sabotaje: intercepta la renta que cobra un rival — te quedas la mitad.',
    unique: 'Escándalo Viral: un rival no puede comprar ni vender durante 2 rondas.',
    color: '#FCEBEB', textColor: '#791F1F',
    activeEffect: 'sabotaje',
    uniqueEffect: 'viral',
    activeCost: 1,   // costs 1 sabotage token
    uniqueCost: 0,
    passiveDesc: 'Cada vez que un rival cobra renta, puedes gastar una ficha de sabotaje para quedarte la mitad. Máximo 3 fichas por partida.',
  },
  negociador: {
    name: 'El Negociador',
    passive: 'Tus tratos son vinculantes. Compras en subasta sin pagar al momento (3 turnos de plazo).',
    active: 'Fusión Forzada: un rival debe venderte una propiedad al precio original ahora mismo.',
    unique: 'Monopolio Express: construye una mejora gratis en cualquier propiedad tuya.',
    color: '#E6F1FB', textColor: '#0C447C',
    activeEffect: 'fusion_forzada',
    uniqueEffect: 'mejora_gratis',
    activeCost: 0,
    uniqueCost: 0,
    passiveDesc: 'Cuando ganas una subasta, puedes pagar en 3 turnos sin intereses. Tus acuerdos verbales son obligatorios.',
  },
  especulador: {
    name: 'El Especulador',
    passive: 'Todas tus propiedades generan +10% de renta extra desde el primer turno.',
    active: 'Burbuja: una propiedad tuya genera el doble de renta durante 3 rondas.',
    unique: 'Pelotazo: vende cualquier propiedad tuya al banco por el doble de su precio original.',
    color: '#FAEEDA', textColor: '#633806',
    activeEffect: 'burbuja',
    uniqueEffect: 'pelotazo',
    activeCost: 0,
    uniqueCost: 0,
    passiveDesc: 'Cada propiedad que compres genera automáticamente un 10% más de renta en cada cobro, sin necesidad de mejoras.',
  },
  asesor: {
    name: 'El Asesor Fiscal',
    passive: 'Pagas un 35% menos en Hacienda, multas y penalizaciones.',
    active: 'Offshore: mueve hasta €100.000 a una cuenta blindada. Ese dinero no puede ser embargado ni afectado por cartas.',
    unique: 'Evasión Total: cancela el efecto de la próxima carta de Escándalo que te toque.',
    color: '#EAF3DE', textColor: '#27500A',
    activeEffect: 'offshore',
    uniqueEffect: 'evasion',
    activeCost: 0,
    uniqueCost: 0,
    passiveDesc: 'Cuando caigas en Hacienda, Inspección o cualquier casilla de penalización, pagas un 35% menos del importe indicado.',
  },
  sindicalista: {
    name: 'El Sindicalista',
    passive: 'Pagas solo el 70% de cualquier renta. El 30% restante desaparece (no va al propietario).',
    active: 'Huelga: bloquea una propiedad rival durante 1 ronda (no genera renta). El dueño puede pagar €15.000 para desbloquearla.',
    unique: 'Huelga General: bloquea TODAS las propiedades de un rival durante 2 rondas.',
    color: '#EEEDFE', textColor: '#3C3489',
    activeEffect: 'huelga',
    uniqueEffect: 'huelga_general',
    activeCost: 0,
    uniqueCost: 0,
    passiveDesc: 'En cada cobro de renta, automáticamente pagas solo el 70%. El propietario no recibe el 30% restante — se pierde.',
  },
  influencer: {
    name: 'El Influencer',
    passive: 'Cobras €5.000 del banco cada vez que cualquier rival compra una propiedad.',
    active: 'Viral: todos los jugadores te pagan €15.000 ahora mismo. Sin posibilidad de negarse.',
    unique: 'Patrocinio: elige un rival — durante 3 rondas cobras el 20% de toda la renta que él genere.',
    color: '#E1F5EE', textColor: '#085041',
    activeEffect: 'viral',
    uniqueEffect: 'patrocinio',
    activeCost: 0,
    uniqueCost: 0,
    passiveDesc: 'Cada vez que un rival compra cualquier propiedad, automáticamente recibes €5.000 del banco como "comisión de visibilidad".',
  },
}

export const PLAYER_COLORS = ['#E24B4A', '#378ADD', '#2ECC71', '#F39C12', '#9B59B6', '#E91E8C']

export function getSquareAtPosition(pos: number): PropertyDef | SpecialSquare | null {
  const prop = PROPERTIES.find(p => p.position === pos)
  if (prop) return prop
  const special = SPECIAL_SQUARES.find(s => s.position === pos)
  if (special) return special
  return null
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

export function calculateRent(prop: PropertyDef, level: number, ownerProps: string[], bubbleActive: boolean, ipcBonus: boolean, ownerRole: string): number {
  let rent = prop.rents[level]
  const groupProps = PROPERTY_GROUPS[prop.group]
  const ownsAll = groupProps.every(k => ownerProps.includes(k))
  if (ownsAll && level === 0) rent = Math.floor(rent * 1.5)  // monopoly bonus: +50% when owning full group
  if (ownsAll && level > 0)  rent = Math.floor(rent * 1.25) // +25% when improved and full group
  if (bubbleActive) rent = Math.floor(rent * 2)
  if (ipcBonus) rent = Math.floor(rent * 1.15)
  if (ownerRole === 'especulador') rent = Math.floor(rent * 1.1)
  return rent
}

export function calculateNetWorth(player: Player, properties: Property[]): number {
  const ownedProps = properties.filter(p => p.owner_id === player.id)
  const propValue = ownedProps.reduce((sum, p) => {
    const def = PROPERTIES.find(pd => pd.key === p.property_key)
    if (!def) return sum
    let val = def.price
    for (let i = 0; i < p.level; i++) val += def.buildCosts[i]
    if (p.ipo_active) val = Math.floor(val * 1.4)
    return sum + val
  }, 0)
  return player.money + (player.offshore_money || 0) + propValue
}

export function hasMonopoly(playerProps: string[], group: string): boolean {
  return PROPERTY_GROUPS[group].every(k => playerProps.includes(k))
}

export function getMonopolyBonus(group: string): string {
  const bonuses: Record<string, string> = {
    startup:     '+50% renta base · Edificar desde 1 propiedad',
    servicios:   '+50% renta base · Edificar desde 1 propiedad',
    corporacion: '+50% renta base · Edificar desde 1 propiedad',
    monopolio:   '+50% renta base · Edificar desde 1 propiedad',
  }
  return bonuses[group] || ''
}