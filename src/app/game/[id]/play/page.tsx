'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PROPERTIES, SPECIAL_SQUARES, ROLES_DEF, PLAYER_COLORS, formatMoney, getSquareAtPosition, calculateRent, calculateNetWorth, TOTAL_SQUARES, ESCANDALO_CARDS, PROPERTY_GROUPS } from '@/lib/gameData'
import { Player, Property, GameState, Role } from '@/types/game'
import { XP_REWARDS, calculateLevel } from '@/lib/xp'

const GROUP_COLORS: Record<string, { bg: string; band: string; text: string }> = {
  startup:     { bg: '#d6e8f7', band: '#185FA5', text: '#185FA5' },
  servicios:   { bg: '#cce8d2', band: '#3B6D11', text: '#3B6D11' },
  corporacion: { bg: '#fce8cc', band: '#854F0B', text: '#854F0B' },
  monopolio:   { bg: '#fad6d6', band: '#A32D2D', text: '#A32D2D' },
}
const LEVEL_NAMES = ['Sin mejora', 'Oficina', 'Sede Regional', 'Holding Nacional']

const ROLE_TIPS: Record<string, { tips: string[]; activeLabel: string; activeDesc: string; uniqueLabel: string; uniqueDesc: string }> = {
  saboteador: {
    tips: ['Guarda tus 3 fichas de sabotaje para rentas altas.', 'Eres inmune a huelgas — no pierdas esa ventaja.', 'El mejor momento para el Escándalo Viral es cuando un rival está a punto de completar un grupo.'],
    activeLabel: 'Huelga Técnica',
    activeDesc: 'Bloquea una propiedad rival. No genera renta este turno.',
    uniqueLabel: 'Escándalo Viral',
    uniqueDesc: 'Un rival no puede comprar ni vender durante 2 rondas.',
  },
  negociador: {
    tips: ['Tus tratos son vinculantes — úsalos para crear acuerdos que favorezcan a largo plazo.', 'Compra en subasta a plazos para no quedarte sin liquidez.', 'Excluye a rivales peligrosos de tus subastas privadas.'],
    activeLabel: 'Subasta Privada',
    activeDesc: 'Organiza una subasta solo entre los jugadores que elijas.',
    uniqueLabel: 'Fusión Forzada',
    uniqueDesc: 'Obliga a un rival a venderte una propiedad al precio original.',
  },
  especulador: {
    tips: ['Tu +10% de renta desde el turno 1 marca la diferencia en partidas largas.', 'Fija precios altos al vender a otros jugadores — es tu mayor ventaja.', 'Activa Burbuja justo antes de que alguien caiga en tu propiedad más cara.'],
    activeLabel: 'Burbuja',
    activeDesc: 'Una propiedad tuya genera +50% de renta durante 2 rondas.',
    uniqueLabel: 'Pelotazo',
    uniqueDesc: 'Vende una propiedad al banco por el doble de su valor.',
  },
  asesor: {
    tips: ['Declara "holding" al comprar para ahorrar un 20% — acumula propiedades rápido.', 'Guarda el Offshore para cuando alguien active Hacienda o Gran Redistribución.', 'Sociedad Pantalla es ideal antes de una negociación importante.'],
    activeLabel: 'Sociedad Pantalla',
    activeDesc: 'Oculta tu efectivo real a todos los demás durante 3 rondas.',
    uniqueLabel: 'Offshore',
    uniqueDesc: 'Aparta €100.000 inmunes a cualquier pago forzado.',
  },
  sindicalista: {
    tips: ['Pagas solo el 70% de renta — casi imposible arruinarte.', 'Convoca votaciones estratégicamente para limitar al jugador que va ganando.', 'El Convenio Colectivo más poderoso: limitar rentas cuando el rival tiene Holding.'],
    activeLabel: 'Huelga General',
    activeDesc: 'Bloquea una propiedad rival esta ronda. El dueño puede cancelarlo por €15.000.',
    uniqueLabel: 'Convenio Colectivo',
    uniqueDesc: 'Propón una ley de juego. Si gana la votación, se aplica esta ronda.',
  },
  influencer: {
    tips: ['Cobras €5.000 cada vez que alguien compra — cuantos más jugadores activos, mejor.', 'Activa Branded Content con el jugador que tenga más propiedades.', 'Viral en el momento justo puede darte el empujón final hacia €1M.'],
    activeLabel: 'Branded Content',
    activeDesc: 'Un rival te genera el 15% de su renta durante 2 rondas.',
    uniqueLabel: 'Viral',
    uniqueDesc: 'Todos los jugadores te pagan €15.000. Sin excepción.',
  },
}

// Audio engine using Web Audio API
function createAudioEngine() {
  if (typeof window === 'undefined') return null
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()

    function playDiceRoll() {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.type = 'square'
          osc.frequency.setValueAtTime(80 + Math.random() * 120, ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08)
          gain.gain.setValueAtTime(0.15, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
          osc.start(); osc.stop(ctx.currentTime + 0.08)
        }, i * 110)
      }
    }

    function playDiceLand() {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(300, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(); osc.stop(ctx.currentTime + 0.15)
    }

    function playTokenMove() {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(600, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
      osc.start(); osc.stop(ctx.currentTime + 0.06)
    }

    function playLandSquare() {
      const freqs = [523, 659, 784]
      freqs.forEach((f, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.type = 'sine'
          osc.frequency.value = f
          gain.gain.setValueAtTime(0.18, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
          osc.start(); osc.stop(ctx.currentTime + 0.2)
        }, i * 80)
      })
    }

    function playBuy() {
      const freqs = [392, 523, 659, 784]
      freqs.forEach((f, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.type = 'sine'
          osc.frequency.value = f
          gain.gain.setValueAtTime(0.2, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
          osc.start(); osc.stop(ctx.currentTime + 0.25)
        }, i * 70)
      })
    }

    function playRent() {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.start(); osc.stop(ctx.currentTime + 0.2)
    }

    return { playDiceRoll, playDiceLand, playTokenMove, playLandSquare, playBuy, playRent }
  } catch { return null }
}

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const DOT_POSITIONS: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[28, 28], [72, 72]],
    3: [[28, 28], [50, 50], [72, 72]],
    4: [[28, 28], [72, 28], [28, 72], [72, 72]],
    5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
    6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
  }
  const dots = DOT_POSITIONS[value] || []
  return (
    <div style={{
      width: '60px', height: '60px',
      background: rolling ? '#fffbe6' : 'white',
      borderRadius: '12px', position: 'relative', flexShrink: 0,
      boxShadow: rolling
        ? '0 0 0 3px #f59e0b, 0 0 28px rgba(245,158,11,0.9), 0 6px 16px rgba(0,0,0,0.5)'
        : '0 6px 16px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -2px 0 rgba(0,0,0,0.1)',
      border: rolling ? '3px solid #f59e0b' : '2px solid #c8c8c8',
      transition: 'box-shadow 0.08s, border 0.08s, background 0.08s',
      animation: rolling ? 'diceShake 0.08s infinite' : 'none',
    }}>
      {dots.map(([cx, cy], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '11px', height: '11px',
          borderRadius: '50%',
          background: rolling ? '#c0392b' : '#1a1a2e',
          top: `${cy}%`, left: `${cx}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }} />
      ))}
    </div>
  )
}

function BoardSquare({ sq, propState, players, myPlayer, isMyTurn, onBuild, tooltipDir, onSquareClick }: {
  sq: any, propState?: Property, players: Player[], myPlayer: Player | null,
  isMyTurn: boolean, onBuild?: (key: string) => void,
  tooltipDir: 'top' | 'bottom' | 'left' | 'right',
  onSquareClick: (sq: any, propState?: Property) => void
}) {
  const isProperty = 'price' in sq
  const owner = propState?.owner_id ? players.find(p => p.id === propState.owner_id) : null
  const ownerIdx = owner ? players.findIndex(p => p.id === owner.id) : -1
  const playersHere = players.filter(p => p.position === sq.position)
  const gc = isProperty ? GROUP_COLORS[sq.group] : null

  const baseBg = gc ? gc.bg : '#252545'
  const tintBg = playersHere.length === 1
    ? `color-mix(in srgb, ${baseBg} 65%, ${PLAYER_COLORS[players.findIndex(p => p.id === playersHere[0].id)]} 35%)`
    : playersHere.length > 1
    ? `color-mix(in srgb, ${baseBg} 90%, #ffffff 10%)`
    : baseBg

  const tooltipPos: Record<string, React.CSSProperties> = {
    top:    { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { left: 'calc(100% + 6px)', top: 0 },
    right:  { right: 'calc(100% + 6px)', top: 0 },
  }

  const specialDesc: Record<string, string> = {
    hacienda:   'Pagas el 15% de tu efectivo al banco.',
    escandalo:  'Roba una carta del mazo rojo.',
    subvencion: 'Cobras dinero del banco sin condiciones.',
    inspeccion: 'El jugador con más propiedades paga €15.000.',
    siesta:     'Pierdes un turno, cobras €5.000.',
    vacaciones: 'Pierdes un turno, cobras €10.000.',
    ere:        'Muévete gratis a cualquier Startup o Servicio.',
    ipo:        'Una propiedad tuya +40% valor de venta.',
    juzgado:    'Paga €50.000 o saca dobles para salir.',
    libre:      'No pasa nada. Solo mirando.',
    salida:     'Cobras €20.000 cada vez que la cruzas.',
  }

  return (
    <div
      className="board-sq"
      onClick={() => onSquareClick(sq, propState)}
      style={{
        background: tintBg, borderRadius: '8px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start', padding: '5px', position: 'relative',
        overflow: 'visible', cursor: 'pointer', height: '100%',
      }}
    >
      {gc && (
        <div style={{
          position: 'absolute', zIndex: 1,
          ...(tooltipDir === 'bottom' ? { bottom: 0, left: 0, right: 0, height: '8px', borderRadius: '0 0 8px 8px' } :
             tooltipDir === 'left'   ? { top: 0, left: 0, bottom: 0, width: '8px', borderRadius: '8px 0 0 8px' } :
             tooltipDir === 'right'  ? { top: 0, right: 0, bottom: 0, width: '8px', borderRadius: '0 8px 8px 0' } :
             { top: 0, left: 0, right: 0, height: '8px', borderRadius: '8px 8px 0 0' }),
          background: gc.band,
        }} />
      )}
      <div style={{
        fontSize: '10.5px', fontWeight: 500, textAlign: 'center', lineHeight: 1.35, zIndex: 1,
        color: gc ? '#1a1a2e' : '#e8e8f5',
        marginTop: gc && tooltipDir === 'top' ? '11px' : '4px',
        marginBottom: '2px',
        ...(tooltipDir === 'left'  ? { marginLeft: '9px' } : {}),
        ...(tooltipDir === 'right' ? { marginRight: '9px' } : {}),
      }}>{sq.name}</div>
      {isProperty && (
        <div style={{ fontSize: '9.5px', fontWeight: 500, color: gc ? '#3d3d60' : '#8888b0', textAlign: 'center', zIndex: 1 }}>
          {formatMoney(sq.price)}
        </div>
      )}
      {playersHere.length > 0 && (
        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '3px', zIndex: 2 }}>
          {playersHere.map(p => {
            const idx = players.findIndex(x => x.id === p.id)
            return (
              <div key={p.id} style={{
                width: '18px', height: '18px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '8px', fontWeight: 700, color: 'white',
                background: PLAYER_COLORS[idx], boxShadow: '0 2px 5px rgba(0,0,0,.6)',
              }}>
                {((p as any).profiles?.username || 'J')[0].toUpperCase()}
              </div>
            )
          })}
        </div>
      )}
      {isMyTurn && isProperty && myPlayer && propState?.owner_id === myPlayer.id && propState.level < 3 && (
        <button onClick={e => { e.stopPropagation(); onBuild?.(sq.key) }} style={{
          marginTop: '2px', fontSize: '9px', color: '#f59e0b',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: '4px', padding: '1px 5px', cursor: 'pointer', zIndex: 2,
        }}>+mejorar</button>
      )}
      {/* Hover tooltip */}
      <div className="sq-tooltip" style={{
        display: 'none', position: 'absolute', background: '#0f0f1e',
        border: '1px solid #3a3a60', borderRadius: '10px', padding: '10px 12px',
        minWidth: '155px', maxWidth: '185px', zIndex: 100, pointerEvents: 'none',
        boxShadow: '0 8px 24px rgba(0,0,0,.7)', ...tooltipPos[tooltipDir],
      }}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#e8e8f5', marginBottom: '6px', borderBottom: '0.5px solid #3a3a60', paddingBottom: '6px' }}>{sq.name}</div>
        {isProperty && gc ? (
          <>
            <div style={{ display: 'inline-block', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: gc.bg, color: gc.text, fontWeight: 500, marginBottom: '6px' }}>
              {sq.group.charAt(0).toUpperCase() + sq.group.slice(1)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}><span style={{ color: '#7070a0' }}>Precio</span><span style={{ fontWeight: 500, color: '#e8e8f5' }}>{formatMoney(sq.price)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}><span style={{ color: '#7070a0' }}>Renta base</span><span style={{ fontWeight: 500, color: '#e8e8f5' }}>{formatMoney(sq.rents[0])}</span></div>
            {propState && propState.level > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}><span style={{ color: '#7070a0' }}>Nivel</span><span style={{ fontWeight: 500, color: '#e8e8f5' }}>{LEVEL_NAMES[propState.level]}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}><span style={{ color: '#7070a0' }}>Holding Nac.</span><span style={{ fontWeight: 500, color: '#e8e8f5' }}>{formatMoney(sq.rents[3])}</span></div>
            {owner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid #3a3a60' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PLAYER_COLORS[ownerIdx] }} />
                <span style={{ fontSize: '11px', color: '#e8e8f5' }}>Dueño: {(owner as any).profiles?.username || 'Jugador'}</span>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#639922', marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid #3a3a60' }}>Libre — nadie la tiene</div>
            )}
          </>
        ) : (
          <div style={{ fontSize: '11px', color: '#8888b0', lineHeight: 1.6 }}>{specialDesc[sq.type] || ''}</div>
        )}
        {playersHere.length > 0 && (
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid #3a3a60' }}>
            {playersHere.map(p => {
              const idx = players.findIndex(x => x.id === p.id)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: PLAYER_COLORS[idx] }} />
                  <span style={{ fontSize: '11px', color: '#b0b0d0' }}>Aquí: {(p as any).profiles?.username || 'Jugador'}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function CornerSquare({ type, players }: { type: string; players: Player[] }) {
  const configs: Record<string, { icon: string; name: string; sub: string; pos: number }> = {
    salida:     { icon: '🚀', name: 'Salida →', sub: 'Cobra €20.000 al pasar', pos: 0 },
    juzgado:    { icon: '⚖️', name: 'Juzgado', sub: '€50k o dobles', pos: 9 },
    libre:      { icon: '☕', name: 'Siesta Libre', sub: 'Solo mirando', pos: 19 },
    vacaciones: { icon: '🏖️', name: 'Vacaciones en Ibiza', sub: '+€10k, pierdes turno', pos: 28 },
  }
  const c = configs[type]
  const playersHere = players.filter(p => p.position === c.pos)
  return (
    <div style={{ background: '#1e1e3a', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px', gap: '3px', height: '100%' }}>
      <div style={{ fontSize: '22px' }}>{c.icon}</div>
      <div style={{ fontSize: '11px', fontWeight: 500, textAlign: 'center', color: '#e8e8f5', lineHeight: 1.3 }}>{c.name}</div>
      <div style={{ fontSize: '9.5px', textAlign: 'center', color: '#7070a0' }}>{c.sub}</div>
      {playersHere.length > 0 && (
        <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2px' }}>
          {playersHere.map(p => {
            const idx = players.findIndex(x => x.id === p.id)
            return <div key={p.id} style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', background: PLAYER_COLORS[idx], boxShadow: '0 2px 5px rgba(0,0,0,.6)' }}>{((p as any).profiles?.username || 'J')[0].toUpperCase()}</div>
          })}
        </div>
      )}
    </div>
  )
}

export default function GamePlay() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string
  const [user, setUser] = useState<any>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [myPlayer, setMyPlayer] = useState<Player | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [rolling, setRolling] = useState(false)
  const [diceValues, setDiceValues] = useState<number[]>([1, 1])
  const [log, setLog] = useState<string[]>([])
  const [modal, setModal] = useState<any>(null)
  const [squarePopup, setSquarePopup] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [xpGain, setXpGain] = useState<number | null>(null)
  const audioRef = useRef<any>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    audioRef.current = createAudioEngine()
    init()
    const iv = setInterval(() => loadAll(), 2000)
    return () => clearInterval(iv)
  }, [mounted])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    await loadAll(user.id)
  }

  async function loadAll(userId?: string) {
    const { data: { user: u } } = await supabase.auth.getUser()
    const uid = userId || u?.id
    const [{ data: pData }, { data: prData }, { data: gsData }] = await Promise.all([
      supabase.from('game_players').select('*, profiles(username, avatar_url)').eq('room_id', roomId).order('turn_order'),
      supabase.from('game_properties').select('*').eq('room_id', roomId),
      supabase.from('game_state').select('*').eq('room_id', roomId).single(),
    ])
    setPlayers(pData || [])
    setProperties(prData || [])
    setGameState(gsData)
    if (uid && pData) { const me = pData.find((p: any) => p.user_id === uid); setMyPlayer(me || null) }
    if (gsData?.log) setLog((gsData.log as any[]).slice(-20).map((l: any) => l.action).reverse())
    setLoading(false)
  }

  async function awardXP(userId: string, amount: number, statUpdates: Record<string, number> = {}) {
    const { data: stats } = await supabase.from('player_stats').select('*').eq('user_id', userId).single()
    if (!stats) { await supabase.from('player_stats').insert({ user_id: userId, xp: amount, ...statUpdates }); return }
    const newXp = stats.xp + amount
    const { level } = calculateLevel(newXp)
    const updates: Record<string, any> = { xp: newXp, level }
    for (const [k, v] of Object.entries(statUpdates)) { updates[k] = (stats[k] || 0) + v }
    await supabase.from('player_stats').update(updates).eq('user_id', userId)
    if (amount > 0) { setXpGain(amount); setTimeout(() => setXpGain(null), 2000) }
  }

  const isMyTurn = myPlayer && gameState && gameState.current_player_id === myPlayer.id

  async function rollDice() {
    if (!isMyTurn || rolling || gameState?.phase !== 'roll') return
    setRolling(true)
    audioRef.current?.playDiceRoll()
    const anim = setInterval(() => {
      setDiceValues([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)])
    }, 80)
    await new Promise(r => setTimeout(r, 700))
    clearInterval(anim)
    const d1 = Math.ceil(Math.random() * 6)
    const d2 = Math.ceil(Math.random() * 6)
    const total = d1 + d2
    setDiceValues([d1, d2])
    audioRef.current?.playDiceLand()

    // Animate token movement step by step
    const startPos = myPlayer!.position
    for (let step = 1; step <= total; step++) {
      await new Promise(r => setTimeout(r, 120))
      const stepPos = (startPos + step) % TOTAL_SQUARES
      await supabase.from('game_players').update({ position: stepPos }).eq('id', myPlayer!.id)
      audioRef.current?.playTokenMove()
    }

    const newPos = (startPos + total) % TOTAL_SQUARES
    const passedGo = startPos + total >= TOTAL_SQUARES
    let newMoney = myPlayer!.money
    if (passedGo) { newMoney += 20000; addLog(`${pname(myPlayer!)} pasa por Salida +€20.000`) }
    await supabase.from('game_players').update({ position: newPos, money: newMoney }).eq('id', myPlayer!.id)
    await supabase.from('game_state').update({ dice_result: [d1, d2], phase: 'action' }).eq('room_id', roomId)
    addLog(`${pname(myPlayer!)} saca ${d1}+${d2}=${total}`)
    audioRef.current?.playLandSquare()
    await handleSquare(newPos, newMoney)
    setRolling(false)
  }

  async function handleSquare(pos: number, currentMoney: number) {
    const sq = getSquareAtPosition(pos)
    if (!sq) { await endTurn(); return }

    // Show square popup
    if ('price' in sq) {
      const prop = properties.find(p => p.property_key === sq.key)
      if (!prop || !prop.owner_id) {
        setSquarePopup({ sq, prop, type: 'buy_prompt' })
        setTimeout(() => {
          setSquarePopup(null)
          setModal({ type: 'buy', square: sq })
        }, 1800)
      } else if (prop.owner_id !== myPlayer!.id) {
        const owner = players.find(p => p.id === prop.owner_id)
        if (!owner) { await endTurn(); return }
        const ownerProps = properties.filter(p => p.owner_id === owner.id).map(p => p.property_key)
        let rent = calculateRent(sq, prop.level, ownerProps, prop.bubble_active, gameState?.ipc_bonus || false, owner.role)
        if (myPlayer!.role === 'sindicalista') rent = Math.floor(rent * 0.7)
        setSquarePopup({ sq, prop, type: 'rent', rent, ownerName: pname(owner) })
        audioRef.current?.playRent()
        await supabase.from('game_players').update({ money: currentMoney - rent }).eq('id', myPlayer!.id)
        await supabase.from('game_players').update({ money: owner.money + rent }).eq('id', owner.id)
        addLog(`${pname(myPlayer!)} paga ${formatMoney(rent)} a ${pname(owner)}`)
        if (user) await awardXP(owner.user_id, XP_REWARDS.rent_collected, { rents_collected: 1 })
        setTimeout(() => { setSquarePopup(null); endTurn() }, 2200)
      } else {
        setSquarePopup({ sq, prop, type: 'own' })
        setTimeout(() => { setSquarePopup(null); endTurn() }, 1500)
      }
    } else {
      setSquarePopup({ sq, type: 'special' })
      setTimeout(async () => {
        setSquarePopup(null)
        await handleSpecial(sq, currentMoney)
      }, 1500)
    }
  }

  async function handleSpecial(sq: any, money: number) {
    switch (sq.type) {
      case 'hacienda': { const t = Math.floor(money * (myPlayer!.role === 'asesor' ? 0.098 : 0.15)); await supabase.from('game_players').update({ money: money - t }).eq('id', myPlayer!.id); addLog(`${pname(myPlayer!)} paga ${formatMoney(t)} a Hacienda`); await endTurn(); break }
      case 'juzgado': { await supabase.from('game_players').update({ in_jail: true }).eq('id', myPlayer!.id); addLog(`${pname(myPlayer!)} va al Juzgado`); await endTurn(); break }
      case 'siesta': { await supabase.from('game_players').update({ money: money + 5000 }).eq('id', myPlayer!.id); addLog(`${pname(myPlayer!)} hace la Siesta +€5.000`); await endTurn(); break }
      case 'vacaciones': { await supabase.from('game_players').update({ money: money + 10000 }).eq('id', myPlayer!.id); addLog(`${pname(myPlayer!)} de vacaciones +€10.000`); await endTurn(); break }
      case 'subvencion': { await supabase.from('game_players').update({ money: money + 40000 }).eq('id', myPlayer!.id); addLog(`${pname(myPlayer!)} recibe Subvención +€40.000`); await endTurn(); break }
      case 'inspeccion': { const r = [...players].sort((a, b) => b.money - a.money)[0]; await supabase.from('game_players').update({ money: r.money - 15000 }).eq('id', r.id); addLog(`Inspección: ${pname(r)} paga €15.000`); await endTurn(); break }
      case 'escandalo': { const card = ESCANDALO_CARDS[Math.floor(Math.random() * ESCANDALO_CARDS.length)]; if (user) await awardXP(user.id, XP_REWARDS.card_played, { cards_played: 1 }); setModal({ type: 'card', card }); break }
      case 'ere': { setModal({ type: 'ere' }); break }
      case 'ipo': { setModal({ type: 'ipo' }); break }
      default: await endTurn()
    }
  }

  async function buyProperty(sq: any) {
    if (!myPlayer || myPlayer.money < sq.price) { setModal(null); await endTurn(); return }
    const existing = properties.find(p => p.property_key === sq.key)
    if (existing) { await supabase.from('game_properties').update({ owner_id: myPlayer.id }).eq('id', existing.id) }
    else { await supabase.from('game_properties').insert({ room_id: roomId, property_key: sq.key, owner_id: myPlayer.id, level: 0 }) }
    let price = sq.price
    if (myPlayer.role === 'asesor') price = Math.floor(price * 0.8)
    await supabase.from('game_players').update({ money: myPlayer.money - price }).eq('id', myPlayer.id)
    if (user) await awardXP(user.id, XP_REWARDS.property_bought, { properties_bought: 1, total_money_earned: price })
    audioRef.current?.playBuy()
    addLog(`${pname(myPlayer)} compra ${sq.name} por ${formatMoney(price)}`)
    setModal(null); await endTurn()
  }

  async function buildImprovement(propertyKey: string) {
    const prop = properties.find(p => p.property_key === propertyKey)
    const def = PROPERTIES.find(p => p.key === propertyKey)
    if (!prop || !def || !myPlayer || prop.level >= 3) return
    const ownerProps = properties.filter(p => p.owner_id === myPlayer.id).map(p => p.property_key)
    if (PROPERTY_GROUPS[def.group].filter(k => ownerProps.includes(k)).length < 2) { setModal({ type: 'error', msg: 'Necesitas al menos 2 propiedades del mismo grupo' }); return }
    const cost = def.buildCosts[prop.level]
    if (myPlayer.money < cost) { setModal({ type: 'error', msg: `No tienes suficiente. Necesitas ${formatMoney(cost)}` }); return }
    await supabase.from('game_properties').update({ level: prop.level + 1 }).eq('id', prop.id)
    await supabase.from('game_players').update({ money: myPlayer.money - cost }).eq('id', myPlayer.id)
    addLog(`${pname(myPlayer)} construye ${LEVEL_NAMES[prop.level + 1]} en ${def.name}`)
    await loadAll()
  }

  async function endTurn() {
    const active = players.filter(p => !p.is_bankrupt)
    const ci = active.findIndex(p => p.id === gameState?.current_player_id)
    const next = active[(ci + 1) % active.length]
    const newRound = (ci + 1) % active.length === 0 ? (gameState?.current_round || 1) + 1 : gameState?.current_round || 1
    for (const p of players) {
      if (calculateNetWorth(p, properties) >= 1000000) {
        if (user) await awardXP(user.id, XP_REWARDS.game_won, { games_won: 1, games_played: 1 })
        for (const other of players) { if (other.id !== p.id && (other as any).user_id) await awardXP((other as any).user_id, XP_REWARDS.game_played, { games_played: 1 }) }
        setModal({ type: 'winner', player: p })
        await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', roomId)
        return
      }
    }
    await supabase.from('game_state').update({
      current_player_id: next.id,
      current_turn: (gameState?.current_turn || 1) + 1,
      current_round: newRound, phase: 'roll',
      log: [...(gameState?.log as any[] || []), ...log.map(l => ({ action: l, timestamp: new Date().toISOString() }))].slice(-50),
    }).eq('room_id', roomId)
  }

  function addLog(msg: string) { setLog(prev => [msg, ...prev].slice(0, 30)) }
  function pname(p: any) { return p?.profiles?.username || 'Jugador' }

  function handleSquareClick(sq: any, propState?: Property) {
    const owner = propState?.owner_id ? players.find(p => p.id === propState.owner_id) : null
    const ownerIdx = owner ? players.findIndex(p => p.id === owner.id) : -1
    setSquarePopup({ sq, prop: propState, owner, ownerIdx, type: 'info' })
  }

  // Build board data with correct positions
  const allSquares = [
    ...PROPERTIES.map(p => ({ ...p })),
    ...SPECIAL_SQUARES.map(s => ({ ...s }))
  ].sort((a, b) => a.position - b.position)

  // pos 20-28: top row left→right displayed right→left (vacaciones corner=28, libre corner=19)
  const topRow    = allSquares.filter(s => s.position >= 20 && s.position <= 27).sort((a, b) => b.position - a.position)
  // pos 10-18: right col top→bottom
  const rightCol  = allSquares.filter(s => s.position >= 10 && s.position <= 18).sort((a, b) => b.position - a.position)
  // pos 1-8: bottom row left→right (salida corner=0, juzgado corner=9)
  const bottomRow = allSquares.filter(s => s.position >= 1 && s.position <= 8).sort((a, b) => a.position - b.position)
  // pos 29-37: left col bottom→top
  const leftCol   = allSquares.filter(s => s.position >= 29 && s.position <= 37).sort((a, b) => b.position - a.position)

  const myRoleDef = myPlayer?.role ? ROLES_DEF[myPlayer.role as Role] : null
  const myRoleTips = myPlayer?.role ? ROLE_TIPS[myPlayer.role] : null

  if (!mounted || loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b' }}><p style={{ color: '#71717a' }}>Cargando partida...</p></div>

  const currentPlayer = players.find(p => p.id === gameState?.current_player_id)
  const myProps = properties.filter(p => p.owner_id === myPlayer?.id)

  return (
    <main style={{ background: '#09090b', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes diceShake { 0%,100%{transform:rotate(-10deg) scale(1.05)} 50%{transform:rotate(10deg) scale(1.05)} }
        @keyframes xpFloat { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-50px) scale(1.3)} }
        @keyframes popIn { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.7)} 60%{transform:translate(-50%,-50%) scale(1.05)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes fadeOut { 0%{opacity:1} 100%{opacity:0} }
        .board-sq:hover .sq-tooltip { display: block !important; }
        .board-sq:hover { filter: brightness(1.07); }
        .board-sq { transition: filter 0.1s; }
      `}</style>

      {/* XP gain toast */}
      {xpGain && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', background: '#f59e0b', color: 'black', borderRadius: '10px', padding: '7px 16px', fontWeight: 700, fontSize: '15px', zIndex: 200, animation: 'xpFloat 2s forwards', pointerEvents: 'none', boxShadow: '0 4px 16px rgba(245,158,11,0.5)' }}>
          +{xpGain} XP ⭐
        </div>
      )}

      {/* Square popup (on land) */}
      {squarePopup && squarePopup.type !== 'info' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            animation: 'popIn 0.3s ease forwards',
            background: squarePopup.type === 'rent' ? '#450a0a' :
              squarePopup.sq && 'price' in squarePopup.sq ? (GROUP_COLORS[squarePopup.sq.group]?.bg || '#18181b') : '#1e1e38',
            border: `2px solid ${squarePopup.sq && 'price' in squarePopup.sq ? (GROUP_COLORS[squarePopup.sq.group]?.band || '#3a3a60') : squarePopup.type === 'rent' ? '#A32D2D' : '#3a3a60'}`,
            borderRadius: '16px', padding: '20px 28px', minWidth: '220px', maxWidth: '300px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)', textAlign: 'center',
          }}>
            {squarePopup.type === 'rent' && (
              <>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>💸</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fca5a5', marginBottom: '4px' }}>{squarePopup.sq.name}</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#fca5a5' }}>−{formatMoney(squarePopup.rent)}</div>
                <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>Renta a {squarePopup.ownerName}</div>
              </>
            )}
            {squarePopup.type === 'buy_prompt' && (
              <>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏢</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: GROUP_COLORS[squarePopup.sq.group]?.text || '#e8e8f5', marginBottom: '4px' }}>{squarePopup.sq.name}</div>
                <div style={{ fontSize: '14px', color: '#71717a' }}>Propiedad libre</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: GROUP_COLORS[squarePopup.sq.group]?.band || '#f59e0b', marginTop: '6px' }}>{formatMoney(squarePopup.sq.price)}</div>
              </>
            )}
            {squarePopup.type === 'own' && (
              <>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: GROUP_COLORS[squarePopup.sq.group]?.text || '#e8e8f5' }}>{squarePopup.sq.name}</div>
                <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>Tu propiedad</div>
              </>
            )}
            {squarePopup.type === 'special' && (
              <>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>
                  {squarePopup.sq.type === 'escandalo' ? '!' :
                   squarePopup.sq.type === 'subvencion' ? '💶' :
                   squarePopup.sq.type === 'hacienda' ? '💸' :
                   squarePopup.sq.type === 'inspeccion' ? '🔍' :
                   squarePopup.sq.type === 'siesta' ? '😴' :
                   squarePopup.sq.type === 'ere' ? '✈️' : '⭐'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e8e8f5' }}>{squarePopup.sq.name}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Square info popup (on click) */}
      {squarePopup && squarePopup.type === 'info' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSquarePopup(null)}>
          <div style={{ background: '#18181b', border: `2px solid ${'price' in squarePopup.sq ? GROUP_COLORS[squarePopup.sq.group]?.band : '#3a3a60'}`, borderRadius: '16px', padding: '20px 24px', maxWidth: '320px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            {'price' in squarePopup.sq ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: GROUP_COLORS[squarePopup.sq.group]?.band }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: GROUP_COLORS[squarePopup.sq.group]?.text, margin: 0 }}>{squarePopup.sq.name}</h3>
                </div>
                <div style={{ background: GROUP_COLORS[squarePopup.sq.group]?.bg, borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                  {[
                    ['Precio de compra', formatMoney(squarePopup.sq.price)],
                    ['Renta sin mejoras', formatMoney(squarePopup.sq.rents[0])],
                    ['Oficina', formatMoney(squarePopup.sq.rents[1])],
                    ['Sede Regional', formatMoney(squarePopup.sq.rents[2])],
                    ['Holding Nacional', formatMoney(squarePopup.sq.rents[3])],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0' }}>
                      <span style={{ color: GROUP_COLORS[squarePopup.sq.group]?.text, opacity: 0.7 }}>{k}</span>
                      <span style={{ color: GROUP_COLORS[squarePopup.sq.group]?.text, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {squarePopup.prop?.level !== undefined && squarePopup.prop.level > 0 && (
                  <div style={{ fontSize: '12px', color: '#71717a', marginBottom: '8px' }}>Nivel actual: <strong style={{ color: '#e8e8f5' }}>{LEVEL_NAMES[squarePopup.prop.level]}</strong></div>
                )}
                {squarePopup.owner ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#27272a', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: PLAYER_COLORS[squarePopup.ownerIdx] }} />
                    <span style={{ fontSize: '13px' }}>Propietario: <strong>{(squarePopup.owner as any).profiles?.username || 'Jugador'}</strong></span>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: '#639922', background: '#14532d22', borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>✅ Libre — nadie la tiene</div>
                )}
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#e8e8f5', marginBottom: '10px' }}>{squarePopup.sq.name}</h3>
                <p style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6 }}>
                  {squarePopup.sq.type === 'hacienda' ? 'Pagas el 15% de tu efectivo al banco. El Asesor Fiscal solo paga el 9,8%.' :
                   squarePopup.sq.type === 'escandalo' ? 'Roba una carta del mazo rojo de Escándalo Nacional y aplica su efecto.' :
                   squarePopup.sq.type === 'subvencion' ? 'Cobras entre €35.000 y €40.000 del banco sin condiciones.' :
                   squarePopup.sq.type === 'inspeccion' ? 'El jugador con más propiedades paga €15.000 al banco.' :
                   squarePopup.sq.type === 'siesta' ? 'Pierdes un turno pero cobras €5.000 del banco.' :
                   squarePopup.sq.type === 'vacaciones' ? 'Pierdes un turno pero cobras €10.000 del banco.' :
                   squarePopup.sq.type === 'ere' ? 'Teletrásporte gratis: muévete a cualquier Startup o Servicio.' :
                   squarePopup.sq.type === 'ipo' ? 'Una propiedad tuya sube un 40% su valor de venta permanentemente.' :
                   squarePopup.sq.type === 'juzgado' ? 'Quedas retenido. Sal pagando €50.000, sacando dobles, o con carta Indulto.' :
                   squarePopup.sq.type === 'salida' ? 'Cobras €20.000 cada vez que la cruzas.' :
                   'No pasa nada. Solo mirando.'}
                </p>
              </>
            )}
            <button onClick={() => setSquarePopup(null)} style={{ width: '100%', marginTop: '14px', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>Cerrar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100vh' }}>

        {/* Left panel — players + role panel */}
        <div style={{ width: '200px', background: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', padding: '12px', overflowY: 'auto', flexShrink: 0 }}>
          <h2 style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>Iberiópolis</h2>
          <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '10px' }}>Ronda {gameState?.current_round} · Turno {gameState?.current_turn}</div>
          {players.map((p, i) => {
            const nw = calculateNetWorth(p, properties)
            const isCurrent = p.id === gameState?.current_player_id
            const progress = Math.min((nw / 1000000) * 100, 100)
            return (
              <div key={p.id} style={{ marginBottom: '8px', padding: '8px', borderRadius: '8px', background: isCurrent ? '#1e1e30' : '#18181b', border: isCurrent ? `1px solid ${PLAYER_COLORS[i]}` : '1px solid #27272a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: PLAYER_COLORS[i], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: 'white', border: '2px solid rgba(255,255,255,.7)', flexShrink: 0 }}>
                    {pname(p)[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pname(p)}</span>
                  {isCurrent && <span style={{ color: '#f59e0b', fontSize: '10px' }}>▶</span>}
                </div>
                <div style={{ fontSize: '10px', color: ROLES_DEF[p.role as Role]?.textColor, marginBottom: '2px' }}>{ROLES_DEF[p.role as Role]?.name}</div>
                <div style={{ fontSize: '12px', color: '#d4d4d8' }}>{formatMoney(p.money)}</div>
                <div style={{ fontSize: '10px', color: '#71717a' }}>Pat: {formatMoney(nw)}</div>
                <div style={{ height: '3px', background: '#27272a', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress}%`, background: PLAYER_COLORS[i], borderRadius: '2px', transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: '9px', color: '#52525b', textAlign: 'right', marginTop: '1px' }}>{Math.floor(progress)}% del objetivo</div>
              </div>
            )
          })}

          {/* My role panel */}
          {myRoleDef && myRoleTips && (
            <div style={{ marginTop: '12px', borderTop: '1px solid #27272a', paddingTop: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: myRoleDef.textColor, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: myRoleDef.textColor }} />
                {myRoleDef.name}
              </div>

              {/* Tips */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' }}>Consejos</div>
                {myRoleTips.tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#9090b0', lineHeight: 1.5, marginBottom: '5px', paddingLeft: '8px', borderLeft: `2px solid ${myRoleDef.textColor}44` }}>
                    {tip}
                  </div>
                ))}
              </div>

              {/* Active ability button */}
              {isMyTurn && (
                <>
                  <div style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' }}>Habilidades</div>
                  <button style={{ width: '100%', background: myRoleDef.color, border: `1px solid ${myRoleDef.textColor}66`, borderRadius: '8px', padding: '7px 8px', cursor: 'pointer', marginBottom: '6px', textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: myRoleDef.textColor, marginBottom: '2px' }}>⚡ {myRoleTips.activeLabel}</div>
                    <div style={{ fontSize: '10px', color: myRoleDef.textColor, opacity: 0.75, lineHeight: 1.4 }}>{myRoleTips.activeDesc}</div>
                  </button>
                  <button style={{ width: '100%', background: '#1e1e30', border: `1px solid ${myRoleDef.textColor}44`, borderRadius: '8px', padding: '7px 8px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: myRoleDef.textColor, marginBottom: '2px' }}>✦ {myRoleTips.uniqueLabel}</div>
                    <div style={{ fontSize: '10px', color: myRoleDef.textColor, opacity: 0.75, lineHeight: 1.4 }}>{myRoleTips.uniqueDesc}</div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center — board */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 'min(100%, 720px)', aspectRatio: '1',
              display: 'grid',
              gridTemplateColumns: '95px repeat(9, 1fr) 95px',
              gridTemplateRows: '95px repeat(7, 1fr) 95px',
              gap: '2px', background: '#1a1a2e', borderRadius: '14px', padding: '6px',
            }}>
              {/* Top-left corner: vacaciones pos=28 */}
              <div style={{ gridColumn: 1, gridRow: 1 }}><CornerSquare type="vacaciones" players={players} /></div>

              {/* Top row: pos 27→20, columns 2→9 */}
              {topRow.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: i + 2, gridRow: 1 }}>
                  <BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="top" onSquareClick={handleSquareClick} />
                </div>
              })}

              {/* Top-right corner: libre pos=19 */}
              <div style={{ gridColumn: 11, gridRow: 1 }}><CornerSquare type="libre" players={players} /></div>

              {/* Right column: pos 18→10, rows 2→9 (note: Supabase has 9 squares, but grid rows 2-9 = 8 slots) */}
              {rightCol.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 11, gridRow: i + 2 }}>
                  <BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="right" onSquareClick={handleSquareClick} />
                </div>
              })}

              {/* Center */}
              <div style={{ gridColumn: '2 / 11', gridRow: '2 / 9', background: '#1e1e38', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #3a3a60' }}>
                <div style={{ fontSize: '24px', fontWeight: 500, color: '#f59e0b' }}>Iberiópolis</div>
                <div style={{ fontSize: '11px', color: '#7070a0' }}>El Monopoly español</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Object.entries(GROUP_COLORS).map(([g, c]) => (
                    <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#9090b0' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: c.band }} />
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '10px', color: '#f59e0b', opacity: .5 }}>Objetivo: €1.000.000</div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {players.map((p, i) => (
                    <div key={p.id} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', background: PLAYER_COLORS[i], boxShadow: '0 2px 4px rgba(0,0,0,.5)' }}>
                      {pname(p)[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom-right corner: juzgado pos=9 */}
              <div style={{ gridColumn: 11, gridRow: 9 }}><CornerSquare type="juzgado" players={players} /></div>

              {/* Bottom row: pos 8→1 reversed so pos 1 is column 2, pos 8 is column 9 */}
              {[...bottomRow].reverse().map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 10 - i, gridRow: 9 }}>
                  <BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="bottom" onSquareClick={handleSquareClick} />
                </div>
              })}

              {/* Bottom-left corner: salida pos=0 */}
              <div style={{ gridColumn: 1, gridRow: 9 }}><CornerSquare type="salida" players={players} /></div>

              {/* Left column: pos 29→37, rows 8→2 (bottom to top) */}
              {leftCol.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 1, gridRow: 8 - i }}>
                  <BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="left" onSquareClick={handleSquareClick} />
                </div>
              })}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid #27272a', padding: '10px 16px', background: '#18181b', flexShrink: 0 }}>
            {myPlayer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Tu dinero</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>{formatMoney(myPlayer.money)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Casilla</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{myPlayer.position}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Turno de</div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{currentPlayer ? pname(currentPlayer) : '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Die value={diceValues[0]} rolling={rolling} />
                  <Die value={diceValues[1]} rolling={rolling} />
                </div>
                {isMyTurn && gameState?.phase === 'roll' && (
                  <button onClick={rollDice} disabled={rolling} style={{ background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px 24px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', boxShadow: '0 0 14px rgba(245,158,11,0.5)' }}>
                    {rolling ? 'Lanzando...' : '🎲 Tirar dados'}
                  </button>
                )}
                {!isMyTurn && <span style={{ color: '#71717a', fontSize: '13px' }}>Esperando tu turno...</span>}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — properties + log */}
        <div style={{ width: '185px', background: '#18181b', borderLeft: '1px solid #27272a', padding: '12px', overflowY: 'auto', flexShrink: 0 }}>
          <h3 style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: '#e8e8f5' }}>Mis propiedades</h3>
          {myProps.length === 0 ? <p style={{ fontSize: '11px', color: '#71717a' }}>Sin propiedades aún</p> : myProps.map(p => {
            const def = PROPERTIES.find(d => d.key === p.property_key)
            if (!def) return null
            const gc = GROUP_COLORS[def.group]
            return (
              <div key={p.id} style={{ marginBottom: '6px', padding: '7px 8px', background: '#27272a', borderRadius: '8px', fontSize: '11px', borderLeft: `3px solid ${gc.band}` }}>
                <div style={{ fontWeight: 500, color: '#e8e8f5' }}>{def.name}</div>
                <div style={{ color: '#71717a' }}>{LEVEL_NAMES[p.level]}</div>
                <div style={{ color: '#71717a' }}>Renta: {formatMoney(def.rents[p.level])}</div>
              </div>
            )
          })}
          <h3 style={{ fontSize: '12px', fontWeight: 500, marginTop: '14px', marginBottom: '8px', color: '#e8e8f5' }}>Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {log.map((e, i) => <p key={i} style={{ fontSize: '10.5px', color: '#71717a', lineHeight: 1.4, margin: 0 }}>{e}</p>)}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '14px', padding: '1.5rem', maxWidth: '380px', width: '90%' }}>

            {modal.type === 'buy' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>¿Comprar {modal.square.name}?</h3>
              <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '3px' }}>Precio: {formatMoney(modal.square.price)}</p>
              <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '3px' }}>Tu dinero: {formatMoney(myPlayer?.money || 0)}</p>
              <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '16px' }}>Renta base: {formatMoney(modal.square.rents[0])}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => buyProperty(modal.square)} style={{ flex: 1, background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 600, cursor: 'pointer' }}>Comprar</button>
                <button onClick={async () => { setModal(null); await endTurn() }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Pasar</button>
              </div>
            </>}

            {modal.type === 'card' && <>
              <div style={{ fontSize: '10px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '10px', background: modal.card.subtype === 'ofensiva' ? '#450a0a' : modal.card.subtype === 'beneficiosa' ? '#14532d' : modal.card.subtype === 'caos' ? '#2e1065' : '#27272a', color: modal.card.subtype === 'ofensiva' ? '#fca5a5' : modal.card.subtype === 'beneficiosa' ? '#86efac' : modal.card.subtype === 'caos' ? '#d8b4fe' : '#d4d4d8' }}>{modal.card.subtype}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{modal.card.name}</h3>
              <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '14px' }}>{modal.card.description}</p>
              {modal.card.storable ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={async () => { await supabase.from('game_cards').insert({ room_id: roomId, player_id: myPlayer?.id, card_key: modal.card.key, card_type: 'escandalo' }); addLog(`${pname(myPlayer)} guarda "${modal.card.name}"`); setModal(null); await endTurn() }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Guardar ✦</button>
                  <button onClick={async () => { setModal(null); await endTurn() }} style={{ flex: 1, background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 600, cursor: 'pointer' }}>Aplicar</button>
                </div>
              ) : (
                <button onClick={async () => { setModal(null); await endTurn() }} style={{ width: '100%', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 600, cursor: 'pointer' }}>Continuar</button>
              )}
            </>}

            {modal.type === 'winner' && <>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>🏆 ¡{pname(modal.player)} gana!</h3>
              <p style={{ color: '#71717a', marginBottom: '16px' }}>Ha alcanzado €1.000.000 de patrimonio neto</p>
              <button onClick={() => { window.location.href = '/lobby' }} style={{ width: '100%', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600, cursor: 'pointer' }}>Volver al lobby</button>
            </>}

            {modal.type === 'ere' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>ERE Express ✈️</h3>
              <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '14px' }}>Muévete gratis a cualquier empresa</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={async () => { const t = PROPERTIES.filter(p => p.group === 'startup')[Math.floor(Math.random() * 4)]; await supabase.from('game_players').update({ position: t.position }).eq('id', myPlayer?.id); addLog(`${pname(myPlayer)} → ${t.name}`); setModal(null); await handleSquare(t.position, myPlayer?.money || 0) }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #185FA5', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>Startup</button>
                <button onClick={async () => { const t = PROPERTIES.filter(p => p.group === 'servicios')[Math.floor(Math.random() * 4)]; await supabase.from('game_players').update({ position: t.position }).eq('id', myPlayer?.id); addLog(`${pname(myPlayer)} → ${t.name}`); setModal(null); await handleSquare(t.position, myPlayer?.money || 0) }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #3B6D11', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>Servicios</button>
              </div>
            </>}

            {modal.type === 'ipo' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>IPO en Bolsa 📈</h3>
              <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '12px' }}>Elige una propiedad para +40% valor venta permanente</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                {myProps.map(p => { const def = PROPERTIES.find(d => d.key === p.property_key); if (!def) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ ipo_active: true }).eq('id', p.id); addLog(`${pname(myPlayer)} saca a bolsa ${def.name}`); setModal(null); await endTurn() }} style={{ textAlign: 'left', background: '#27272a', color: 'white', border: `1px solid ${GROUP_COLORS[def.group].band}`, borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>{def.name}</button> })}
              </div>
              <button onClick={async () => { setModal(null); await endTurn() }} style={{ width: '100%', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '13px' }}>Pasar</button>
            </>}

            {modal.type === 'error' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>⚠️ Error</h3>
              <p style={{ color: '#71717a', marginBottom: '14px' }}>{modal.msg}</p>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Cerrar</button>
            </>}
          </div>
        </div>
      )}
    </main>
  )
}