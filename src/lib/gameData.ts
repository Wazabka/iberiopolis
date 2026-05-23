import { PropertyDef, SpecialSquare, CardDef } from '@/types/game'

export const PROPERTIES: PropertyDef[] = [
  { key: 'glovo', name: 'Glovo', group: 'startup', price: 40000, rents: [2000, 5000, 12000, 25000], buildCosts: [20000, 40000, 80000], position: 1 },
  { key: 'cabify', name: 'Cabify', group: 'startup', price: 40000, rents: [2000, 5000, 12000, 25000], buildCosts: [20000, 40000, 80000], position: 2 },
  { key: 'idealista', name: 'Idealista', group: 'startup', price: 60000, rents: [3000, 7000, 16000, 32000], buildCosts: [20000, 40000, 80000], position: 4 },
  { key: 'wallapop', name: 'Wallapop', group: 'startup', price: 60000, rents: [3000, 7000, 16000, 32000], buildCosts: [20000, 40000, 80000], position: 6 },
  { key: 'elcorteingles', name: 'El Corte Inglés', group: 'servicios', price: 120000, rents: [8000, 18000, 36000, 65000], buildCosts: [50000, 100000, 180000], position: 8 },
  { key: 'bbva', name: 'BBVA', group: 'servicios', price: 130000, rents: [9000, 20000, 38000, 70000], buildCosts: [50000, 100000, 180000], position: 10 },
  { key: 'santander', name: 'Santander', group: 'servicios', price: 140000, rents: [10000, 22000, 42000, 75000], buildCosts: [50000, 100000, 180000], position: 12 },
  { key: 'mapfre', name: 'Mapfre', group: 'servicios', price: 150000, rents: [11000, 24000, 46000, 80000], buildCosts: [50000, 100000, 180000], position: 14 },
  { key: 'iberia', name: 'Iberia', group: 'corporacion', price: 200000, rents: [16000, 34000, 65000, 110000], buildCosts: [90000, 160000, 280000], position: 16 },
  { key: 'repsol', name: 'Repsol', group: 'corporacion', price: 220000, rents: [18000, 38000, 72000, 120000], buildCosts: [90000, 160000, 280000], position: 18 },
  { key: 'endesa', name: 'Endesa', group: 'corporacion', price: 240000, rents: [20000, 42000, 80000, 130000], buildCosts: [90000, 160000, 280000], position: 20 },
  { key: 'acs', name: 'ACS', group: 'corporacion', price: 260000, rents: [22000, 46000, 88000, 145000], buildCosts: [90000, 160000, 280000], position: 22 },
  { key: 'inditex', name: 'Inditex', group: 'monopolio', price: 300000, rents: [28000, 58000, 110000, 180000], buildCosts: [130000, 220000, 380000], position: 24 },
  { key: 'mercadona', name: 'Mercadona', group: 'monopolio', price: 320000, rents: [30000, 62000, 118000, 195000], buildCosts: [130000, 220000, 380000], position: 26 },
  { key: 'telefonica', name: 'Telefónica', group: 'monopolio', price: 350000, rents: [34000, 70000, 130000, 215000], buildCosts: [130000, 220000, 380000], position: 29 },
  { key: 'santanderbbva', name: 'Santander + BBVA', group: 'monopolio', price: 400000, rents: [40000, 80000, 150000, 240000], buildCosts: [130000, 220000, 380000], position: 31 },
]

export const PROPERTY_GROUPS: Record<string, string[]> = {
  startup: ['glovo', 'cabify', 'idealista', 'wallapop'],
  servicios: ['elcorteingles', 'bbva', 'santander', 'mapfre'],
  corporacion: ['iberia', 'repsol', 'endesa', 'acs'],
  monopolio: ['inditex', 'mercadona', 'telefonica', 'santanderbbva'],
}

export const SPECIAL_SQUARES: SpecialSquare[] = [
  { key: 'salida', name: 'Salida', type: 'salida', position: 0 },
  { key: 'escandalo1', name: 'Escándalo Nacional', type: 'escandalo', position: 3 },
  { key: 'hacienda1', name: 'Hacienda Somos Todos', type: 'hacienda', position: 5 },
  { key: 'siesta', name: 'Siesta Nacional', type: 'siesta', position: 7 },
  { key: 'juzgado', name: 'Juzgado de lo Social', type: 'juzgado', position: 9 },
  { key: 'subvencion1', name: 'Subvención UE', type: 'subvencion', position: 11 },
  { key: 'ere', name: 'ERE Express', type: 'ere', position: 13 },
  { key: 'escandalo2', name: 'Escándalo Nacional', type: 'escandalo', position: 15 },
  { key: 'inspeccion1', name: 'Inspección Laboral', type: 'inspeccion', position: 17 },
  { key: 'libre', name: 'Siesta Libre', type: 'libre', position: 19 },
  { key: 'escandalo3', name: 'Escándalo Nacional', type: 'escandalo', position: 21 },
  { key: 'subvencion2', name: 'Subvención PYME', type: 'subvencion', position: 23 },
  { key: 'escandalo4', name: 'Escándalo Nacional', type: 'escandalo', position: 25 },
  { key: 'hacienda2', name: 'Hacienda Somos Todos', type: 'hacienda', position: 27 },
  { key: 'vacaciones', name: 'Vacaciones en Ibiza', type: 'vacaciones', position: 28 },
  { key: 'subvencion3', name: 'Digitalización Digital', type: 'subvencion', position: 30 },
  { key: 'escandalo5', name: 'Escándalo Nacional', type: 'escandalo', position: 32 },
  { key: 'boom', name: 'Boom Turístico', type: 'subvencion', position: 33 },
  { key: 'ipo', name: 'IPO en Bolsa', type: 'ipo', position: 34 },
  { key: 'escandalo6', name: 'Escándalo Nacional', type: 'escandalo', position: 35 },
  { key: 'inspeccion2', name: 'Inspección Laboral', type: 'inspeccion', position: 36 },
  { key: 'crack', name: 'Crack del 29', type: 'escandalo', position: 37 },
]

export const TOTAL_SQUARES = 38

export const ESCANDALO_CARDS: CardDef[] = [
  { key: 'filtraciones', name: 'Filtraciones a la prensa', type: 'escandalo', subtype: 'ofensiva', storable: false, description: 'Elige a un rival. Debe revelar todo su dinero y cartas en mano.' },
  { key: 'inspeccion_hacienda', name: 'Inspección de Hacienda', type: 'escandalo', subtype: 'ofensiva', storable: false, description: 'El rival con más propiedades paga el 20% de su efectivo al banco.' },
  { key: 'expediente', name: 'Expediente de regulación', type: 'escandalo', subtype: 'ofensiva', storable: false, description: 'Elige una propiedad rival. No genera renta 2 rondas. Puede cancelarse por €20.000.' },
  { key: 'opa_hostil', name: 'OPA hostil', type: 'escandalo', subtype: 'ofensiva', storable: true, description: 'Obliga a un rival a venderte una propiedad sin mejoras al precio original.' },
  { key: 'demanda_colectiva', name: 'Demanda colectiva', type: 'escandalo', subtype: 'ofensiva', storable: false, description: 'Votación: el más votado no puede construir mejoras durante 2 rondas.' },
  { key: 'cartel', name: 'Cártel empresarial', type: 'escandalo', subtype: 'ofensiva', storable: false, description: 'Rompe automáticamente cualquier alianza activa. Ambos pagan €30.000.' },
  { key: 'crisis_suministro', name: 'Crisis de suministro', type: 'escandalo', subtype: 'neutral', storable: false, description: 'Nadie puede construir mejoras esta ronda. Holdings cobran -20% renta.' },
  { key: 'subida_ipc', name: 'Subida del IPC', type: 'escandalo', subtype: 'neutral', storable: false, description: 'Todas las rentas de esta ronda se incrementan un 15%.' },
  { key: 'elecciones', name: 'Elecciones generales', type: 'escandalo', subtype: 'neutral', storable: false, description: 'El jugador elegido por votación decide el orden de turno esta ronda.' },
  { key: 'fusion_bancaria', name: 'Fusión bancaria', type: 'escandalo', subtype: 'neutral', storable: false, description: 'Los dos jugadores con menos dinero intercambian una propiedad.' },
  { key: 'apagon_digital', name: 'Apagón digital', type: 'escandalo', subtype: 'neutral', storable: false, description: 'Startups sin renta esta ronda. Sus dueños cobran €10.000 de compensación.' },
  { key: 'huelga_transportes', name: 'Huelga de transportes', type: 'escandalo', subtype: 'neutral', storable: false, description: 'Esta ronda nadie puede moverse más de 6 casillas.' },
  { key: 'obra_publica', name: 'Contrato de obra pública', type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'Construye una mejora gratis en cualquier propiedad tuya.' },
  { key: 'bono_social', name: 'Bono social del gobierno', type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'El jugador con menos patrimonio neto cobra €50.000 del banco.' },
  { key: 'indulto', name: 'Indulto político', type: 'escandalo', subtype: 'beneficiosa', storable: true, description: 'Sales del Juzgado gratis. Guárdala si no la necesitas ahora.' },
  { key: 'subvencion_ue', name: 'Subvención europea', type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'Cobras €40.000 del banco sin condiciones.' },
  { key: 'boom_turistico', name: 'Boom turístico', type: 'escandalo', subtype: 'beneficiosa', storable: true, description: 'Todas tus propiedades generan el doble de renta durante 1 ronda.' },
  { key: 'ipo_bolsa', name: 'IPO en Bolsa', type: 'escandalo', subtype: 'beneficiosa', storable: false, description: 'Elige una propiedad tuya. Su valor de venta sube un 40% permanentemente.' },
  { key: 'apagon_regulatorio', name: 'Apagón regulatorio', type: 'escandalo', subtype: 'caos', storable: false, description: 'Todas las pasivas de todos los roles quedan desactivadas esta ronda.' },
  { key: 'gran_redistribucion', name: 'Gran redistribución', type: 'escandalo', subtype: 'caos', storable: false, description: 'Todo el efectivo va al centro y se reparte a partes iguales.' },
  { key: 'rotacion_activos', name: 'Rotación de activos', type: 'escandalo', subtype: 'caos', storable: false, description: 'Cada jugador cede su propiedad más barata al jugador de su izquierda.' },
  { key: 'crack_29', name: 'Crack del 29', type: 'escandalo', subtype: 'caos', storable: false, description: 'El jugador con más patrimonio neto pierde el 25% de su efectivo.' },
  { key: 'intervencion_estado', name: 'Intervención del Estado', type: 'escandalo', subtype: 'caos', storable: false, description: 'El jugador con más propiedades cede una al banco, que la subasta.' },
  { key: 'corralito', name: 'Corralito', type: 'escandalo', subtype: 'caos', storable: false, description: 'Durante 2 rondas, nadie puede gastar más de €30.000 por turno.' },
]

export const SUBVENCION_CARDS: CardDef[] = [
  { key: 'fondo_cohesion', name: 'Fondo de cohesión', type: 'subvencion', storable: false, description: 'Cobras €35.000 del banco sin condiciones.' },
  { key: 'plan_renove', name: 'Plan Renove empresarial', type: 'subvencion', storable: false, description: 'Degrada una mejora y recupera el 90% del coste en vez del 60%.' },
  { key: 'incentivo_contratacion', name: 'Incentivo a la contratación', type: 'subvencion', storable: false, description: 'Tu próxima compra tiene un 15% de descuento.' },
  { key: 'digitalizacion_pyme', name: 'Digitalización PYME', type: 'subvencion', storable: false, description: 'Cobras €20.000 por cada Startup que poseas (máximo €60.000).' },
  { key: 'credito_ico', name: 'Crédito ICO', type: 'subvencion', storable: true, description: 'El banco cubre cualquier pago que te caiga, hasta €80.000.' },
]

export const ROLES_DEF = {
  saboteador: {
    name: 'El Saboteador',
    passive: 'Intercepta rentas ajenas gastando fichas de sabotaje. Tus propiedades son inmunes a bloqueos.',
    active: 'Huelga técnica en propiedad ajena — sin renta ese turno.',
    unique: 'Escándalo Viral — rival no puede comprar/vender 2 rondas.',
    color: '#FCEBEB',
    textColor: '#791F1F',
  },
  negociador: {
    name: 'El Negociador',
    passive: 'Tus tratos son vinculantes. Compras en subasta a plazos (3 turnos, sin interés).',
    active: 'Subasta privada — elige qué jugadores participan.',
    unique: 'Fusión Forzada — rival te vende una propiedad al precio original.',
    color: '#E6F1FB',
    textColor: '#0C447C',
  },
  especulador: {
    name: 'El Especulador',
    passive: 'Cada propiedad genera +10% renta desde el turno 1. Tú fijas el precio de venta a otros jugadores.',
    active: 'Burbuja — propiedad tuya +50% renta durante 2 rondas.',
    unique: 'Pelotazo — vende al banco por el doble del valor original.',
    color: '#FAEEDA',
    textColor: '#633806',
  },
  asesor: {
    name: 'El Asesor Fiscal',
    passive: 'Pagas 35% menos en penalizaciones. Al comprar puedes declarar "holding" (-20% precio, sin mejoras 1 ronda).',
    active: 'Sociedad Pantalla — oculta tu efectivo real durante 3 rondas.',
    unique: 'Offshore — aparta €100.000 inmune a pagos forzados.',
    color: '#EAF3DE',
    textColor: '#27500A',
  },
  sindicalista: {
    name: 'El Sindicalista',
    passive: 'Pagas solo el 70% de cada renta. Puedes convocar 1 votación por ronda.',
    active: 'Huelga General — bloquea propiedad ajena (dueño cancela por €15.000).',
    unique: 'Convenio Colectivo — aprueba una ley de juego por mayoría.',
    color: '#EEEDFE',
    textColor: '#3C3489',
  },
  influencer: {
    name: 'El Influencer',
    passive: 'Cobras €5.000 cada vez que un rival compra. Si ese rival cae en tu propiedad en 3 turnos, paga +25%.',
    active: 'Branded Content — rival te genera 15% de su renta durante 2 rondas.',
    unique: 'Viral — todos te pagan €15.000 sin excepción.',
    color: '#E1F5EE',
    textColor: '#085041',
  },
}

export const PLAYER_COLORS = ['#E24B4A', '#378ADD', '#639922', '#BA7517', '#7F77DD', '#D4537E']

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
  if (ownsAll && level === 0) rent = Math.floor(rent * 1.25)
  if (bubbleActive) rent = Math.floor(rent * 1.5)
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
  return player.money + player.offshore_money + propValue
}