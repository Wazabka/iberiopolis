'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PROPERTIES, SPECIAL_SQUARES, ROLES_DEF, PLAYER_COLORS, formatMoney, getSquareAtPosition, calculateRent, calculateNetWorth, TOTAL_SQUARES, ESCANDALO_CARDS, PROPERTY_GROUPS } from '@/lib/gameData'
import { Player, Property, GameState, Role } from '@/types/game'

const GROUP_COLORS: Record<string, { bg: string; band: string; text: string; badge: string }> = {
  startup:    { bg: '#d6e8f7', band: '#185FA5', text: '#185FA5', badge: '#d6e8f7' },
  servicios:  { bg: '#cce8d2', band: '#3B6D11', text: '#3B6D11', badge: '#cce8d2' },
  corporacion:{ bg: '#fce8cc', band: '#854F0B', text: '#854F0B', badge: '#fce8cc' },
  monopolio:  { bg: '#fad6d6', band: '#A32D2D', text: '#A32D2D', badge: '#fad6d6' },
}

const LEVEL_NAMES = ['Sin mejora', 'Oficina', 'Sede Regional', 'Holding Nacional']
const LEVEL_RENTS_KEY = [0, 1, 2, 3]

function tintColor(base: string, tint: string, amount = 0.35): string {
  return `color-mix(in srgb, ${base} ${Math.round((1 - amount) * 100)}%, ${tint} ${Math.round(amount * 100)}%)`
}

function BoardSquare({
  sq, propState, players, myPlayer, isMyTurn, onBuild, position, side
}: {
  sq: any, propState?: Property, players: Player[], myPlayer: Player | null,
  isMyTurn: boolean, onBuild?: (key: string) => void, position: 'top' | 'bottom' | 'left' | 'right', side?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const isProperty = 'price' in sq
  const owner = propState?.owner_id ? players.find(p => p.id === propState.owner_id) : null
  const ownerIdx = owner ? players.findIndex(p => p.id === owner.id) : -1
  const playersHere = players.filter(p => p.position === sq.position)
  const gc = isProperty ? GROUP_COLORS[sq.group] : null

  const baseBg = gc ? gc.bg : '#252545'
  const tintBg = playersHere.length === 1
    ? tintColor(baseBg, PLAYER_COLORS[players.findIndex(p => p.id === playersHere[0].id)], 0.35)
    : playersHere.length > 1
      ? tintColor(baseBg, '#ffffff', 0.1)
      : baseBg

  const tooltipStyle: React.CSSProperties = {
    display: 'none',
    position: 'absolute',
    background: '#0f0f1e',
    border: '1px solid #3a3a60',
    borderRadius: '10px',
    padding: '10px 12px',
    minWidth: '160px',
    maxWidth: '190px',
    zIndex: 100,
    pointerEvents: 'none',
    boxShadow: '0 8px 24px rgba(0,0,0,.7)',
    fontSize: '11px',
    color: '#e8e8f5',
    ...(position === 'top' ? { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' } :
       position === 'bottom' ? { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' } :
       position === 'left' ? { left: 'calc(100% + 6px)', top: 0 } :
       { right: 'calc(100% + 6px)', top: 0 })
  }

  const bandStyle: React.CSSProperties = gc ? (
    side === 'top' || !side ? { position: 'absolute', top: 0, left: 0, right: 0, height: '9px', borderRadius: '8px 8px 0 0', background: gc.band } :
    side === 'bottom' ? { position: 'absolute', bottom: 0, left: 0, right: 0, height: '9px', borderRadius: '0 0 8px 8px', background: gc.band } :
    side === 'left' ? { position: 'absolute', top: 0, left: 0, bottom: 0, width: '9px', borderRadius: '8px 0 0 8px', background: gc.band } :
    { position: 'absolute', top: 0, right: 0, bottom: 0, width: '9px', borderRadius: '0 8px 8px 0', background: gc.band }
  ) : {}

  const nameStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 500, textAlign: 'center', lineHeight: 1.4, zIndex: 1,
    color: gc ? '#1a1a2e' : '#e8e8f5',
    marginTop: gc ? (side === 'top' || !side ? '12px' : '4px') : '5px',
    ...(side === 'left' ? { marginLeft: '9px' } : side === 'right' ? { marginRight: '9px' } : {})
  }

  const priceStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 500, textAlign: 'center', marginTop: '3px', zIndex: 1,
    color: gc ? '#3d3d60' : '#8888b0',
    ...(side === 'left' ? { marginLeft: '9px' } : side === 'right' ? { marginRight: '9px' } : {})
  }

  return (
    <div
      className="board-sq"
      style={{ background: tintBg, borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '6px 5px 5px', position: 'relative', overflow: 'visible', cursor: 'pointer' }}
    >
      {gc && <div style={bandStyle} />}

      <div style={nameStyle}>{sq.name}</div>
      {isProperty && <div style={priceStyle}>{formatMoney(sq.price)} · {formatMoney(sq.rents[0])}</div>}
      {!isProperty && sq.type !== 'salida' && sq.type !== 'juzgado' && sq.type !== 'libre' && (
        <div style={priceStyle}>{
          sq.type === 'hacienda' ? '−15% efectivo' :
          sq.type === 'siesta' ? '−turno +€5k' :
          sq.type === 'vacaciones' ? '−turno +€10k' :
          sq.type === 'subvencion' ? '+€40k' :
          sq.type === 'inspeccion' ? '+prop. paga €15k' :
          sq.type === 'escandalo' ? 'Roba carta !' :
          sq.type === 'ere' ? 'Teletrásporte' :
          sq.type === 'ipo' ? '+40% valor venta' :
          ''
        }</div>
      )}

      {playersHere.length > 0 && (
        <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '4px', zIndex: 2 }}>
          {playersHere.map(p => {
            const idx = players.findIndex(x => x.id === p.id)
            return (
              <div key={p.id} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', background: PLAYER_COLORS[idx], boxShadow: '0 2px 5px rgba(0,0,0,.6)', flexShrink: 0 }}>
                {((p as any).profiles?.username || 'J')[0].toUpperCase()}
              </div>
            )
          })}
        </div>
      )}

      {isMyTurn && isProperty && myPlayer && propState?.owner_id === myPlayer.id && propState.level < 3 && (
        <button
          onClick={(e) => { e.stopPropagation(); onBuild?.(sq.key) }}
          style={{ marginTop: '3px', fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 5px', cursor: 'pointer', zIndex: 2 }}
        >
          +mejorar
        </button>
      )}

      <div className="sq-tooltip" style={tooltipStyle}>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#e8e8f5', marginBottom: '6px', borderBottom: '0.5px solid #3a3a60', paddingBottom: '6px' }}>{sq.name}</div>
        {isProperty && gc && (
          <>
            <div style={{ display: 'inline-block', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: gc.badge, color: gc.text, fontWeight: 500, marginBottom: '6px' }}>{sq.group.charAt(0).toUpperCase() + sq.group.slice(1)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}><span style={{ color: '#7070a0' }}>Precio</span><span style={{ fontWeight: 500 }}>{formatMoney(sq.price)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}><span style={{ color: '#7070a0' }}>Renta base</span><span style={{ fontWeight: 500 }}>{formatMoney(sq.rents[0])}</span></div>
            {propState && propState.level > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}><span style={{ color: '#7070a0' }}>Nivel</span><span style={{ fontWeight: 500 }}>{LEVEL_NAMES[propState.level]}</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}><span style={{ color: '#7070a0' }}>Holding</span><span style={{ fontWeight: 500 }}>{formatMoney(sq.rents[3])}</span></div>
            {owner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid #3a3a60' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PLAYER_COLORS[ownerIdx] }} />
                <span style={{ fontSize: '11px' }}>Dueño: {(owner as any).profiles?.username || 'Jugador'}</span>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#639922', marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid #3a3a60' }}>Libre — nadie la tiene</div>
            )}
          </>
        )}
        {!isProperty && (
          <div style={{ fontSize: '11px', color: '#8888b0', lineHeight: 1.6 }}>{
            sq.type === 'hacienda' ? 'Pagas el 15% de tu efectivo al banco. El Asesor Fiscal solo paga el 9,8%.' :
            sq.type === 'escandalo' ? 'Roba una carta del mazo rojo y aplica su efecto.' :
            sq.type === 'subvencion' ? 'Cobras dinero del banco sin condiciones.' :
            sq.type === 'inspeccion' ? 'El jugador con más propiedades paga €15.000 al banco.' :
            sq.type === 'siesta' ? 'Pierdes un turno pero cobras €5.000 del banco.' :
            sq.type === 'vacaciones' ? 'Pierdes un turno pero cobras €10.000 del banco.' :
            sq.type === 'ere' ? 'Muévete gratis a cualquier Startup o Servicio.' :
            sq.type === 'ipo' ? 'Una propiedad tuya sube un 40% su valor de venta.' :
            sq.type === 'juzgado' ? 'Paga €50.000 o saca dobles para salir.' :
            sq.type === 'libre' ? 'No pasa nada. Descansa.' :
            sq.type === 'salida' ? 'Cobras €20.000 cada vez que pasas.' : ''
          }</div>
        )}
        {playersHere.length > 0 && (
          <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '0.5px solid #3a3a60' }}>
            {playersHere.map(p => {
              const idx = players.findIndex(x => x.id === p.id)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '3px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PLAYER_COLORS[idx] }} />
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

function CornerSquare({ type, players }: { type: string, players: Player[] }) {
  const configs: Record<string, { icon: string; name: string; sub: string; pos: number }> = {
    salida:     { icon: '🚀', name: 'Salida →', sub: 'Cobra €20.000 al pasar', pos: 0 },
    juzgado:    { icon: '⚖️', name: 'Juzgado de lo Social', sub: '€50k o dobles', pos: 9 },
    libre:      { icon: '☕', name: 'Siesta Libre', sub: 'Solo mirando', pos: 19 },
    vacaciones: { icon: '🏖️', name: 'Vacaciones en Ibiza', sub: 'Pierdes turno +€10k', pos: 28 },
  }
  const c = configs[type]
  const playersHere = players.filter(p => p.position === c.pos)
  return (
    <div style={{ background: '#1e1e3a', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px', gap: '4px' }}>
      <div style={{ fontSize: '24px' }}>{c.icon}</div>
      <div style={{ fontSize: '12px', fontWeight: 500, textAlign: 'center', color: '#e8e8f5', lineHeight: 1.4 }}>{c.name}</div>
      <div style={{ fontSize: '10px', textAlign: 'center', color: '#7070a0' }}>{c.sub}</div>
      {playersHere.length > 0 && (
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
          {playersHere.map(p => {
            const idx = players.findIndex(x => x.id === p.id)
            return <div key={p.id} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white', background: PLAYER_COLORS[idx], boxShadow: '0 2px 5px rgba(0,0,0,.6)' }}>{((p as any).profiles?.username || 'J')[0].toUpperCase()}</div>
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
  const [diceAnim, setDiceAnim] = useState<number[]>([])
  const [log, setLog] = useState<string[]>([])
  const [modal, setModal] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    init()
    const interval = setInterval(() => loadAll(), 2000)
    return () => clearInterval(interval)
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
    if (uid && pData) {
      const me = pData.find((p: any) => p.user_id === uid)
      setMyPlayer(me || null)
    }
    if (gsData?.log) setLog((gsData.log as any[]).slice(-20).map((l: any) => l.action).reverse())
    setLoading(false)
  }

  const isMyTurn = myPlayer && gameState && gameState.current_player_id === myPlayer.id

  async function rollDice() {
    if (!isMyTurn || rolling || gameState?.phase !== 'roll') return
    setRolling(true)
    for (let i = 0; i < 8; i++) {
      setDiceAnim([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)])
      await new Promise(r => setTimeout(r, 80))
    }
    const d1 = Math.ceil(Math.random() * 6)
    const d2 = Math.ceil(Math.random() * 6)
    const total = d1 + d2
    setDiceAnim([d1, d2])
    const newPos = (myPlayer!.position + total) % TOTAL_SQUARES
    const passedGo = myPlayer!.position + total >= TOTAL_SQUARES
    let newMoney = myPlayer!.money
    if (passedGo) { newMoney += 20000; addLog(`${name(myPlayer!)} pasa por la Salida +€20.000`) }
    await supabase.from('game_players').update({ position: newPos, money: newMoney }).eq('id', myPlayer!.id)
    await supabase.from('game_state').update({ dice_result: [d1, d2], phase: 'action' }).eq('room_id', roomId)
    addLog(`${name(myPlayer!)} saca ${d1}+${d2}=${total}`)
    await handleSquare(newPos, newMoney)
    setRolling(false)
  }

  async function handleSquare(pos: number, currentMoney: number) {
    const sq = getSquareAtPosition(pos)
    if (!sq) { await endTurn(); return }
    if ('price' in sq) {
      const prop = properties.find(p => p.property_key === sq.key)
      if (!prop || !prop.owner_id) {
        setModal({ type: 'buy', square: sq })
      } else if (prop.owner_id !== myPlayer!.id) {
        const owner = players.find(p => p.id === prop.owner_id)
        if (!owner) { await endTurn(); return }
        const ownerProps = properties.filter(p => p.owner_id === owner.id).map(p => p.property_key)
        let rent = calculateRent(sq, prop.level, ownerProps, prop.bubble_active, gameState?.ipc_bonus || false, owner.role)
        if (myPlayer!.role === 'sindicalista') rent = Math.floor(rent * 0.7)
        await supabase.from('game_players').update({ money: currentMoney - rent }).eq('id', myPlayer!.id)
        await supabase.from('game_players').update({ money: owner.money + rent }).eq('id', owner.id)
        addLog(`${name(myPlayer!)} paga ${formatMoney(rent)} a ${name(owner)}`)
        await endTurn()
      } else { await endTurn() }
    } else { await handleSpecial(sq, currentMoney) }
  }

  async function handleSpecial(sq: any, money: number) {
    switch (sq.type) {
      case 'hacienda': { const t = Math.floor(money * (myPlayer!.role === 'asesor' ? 0.098 : 0.15)); await supabase.from('game_players').update({ money: money - t }).eq('id', myPlayer!.id); addLog(`${name(myPlayer!)} paga ${formatMoney(t)} a Hacienda`); await endTurn(); break }
      case 'juzgado': { await supabase.from('game_players').update({ in_jail: true }).eq('id', myPlayer!.id); addLog(`${name(myPlayer!)} va al Juzgado`); await endTurn(); break }
      case 'siesta': { await supabase.from('game_players').update({ money: money + 5000 }).eq('id', myPlayer!.id); addLog(`${name(myPlayer!)} hace la Siesta +€5.000`); await endTurn(); break }
      case 'vacaciones': { await supabase.from('game_players').update({ money: money + 10000 }).eq('id', myPlayer!.id); addLog(`${name(myPlayer!)} de vacaciones +€10.000`); await endTurn(); break }
      case 'subvencion': { await supabase.from('game_players').update({ money: money + 40000 }).eq('id', myPlayer!.id); addLog(`${name(myPlayer!)} recibe Subvención +€40.000`); await endTurn(); break }
      case 'inspeccion': { const r = [...players].sort((a, b) => b.money - a.money)[0]; await supabase.from('game_players').update({ money: r.money - 15000 }).eq('id', r.id); addLog(`Inspección: ${name(r)} paga €15.000`); await endTurn(); break }
      case 'escandalo': { setModal({ type: 'card', card: ESCANDALO_CARDS[Math.floor(Math.random() * ESCANDALO_CARDS.length)] }); break }
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
    addLog(`${name(myPlayer)} compra ${sq.name} por ${formatMoney(price)}`)
    setModal(null); await endTurn()
  }

  async function buildImprovement(propertyKey: string) {
    const prop = properties.find(p => p.property_key === propertyKey)
    const def = PROPERTIES.find(p => p.key === propertyKey)
    if (!prop || !def || !myPlayer || prop.level >= 3) return
    const ownerProps = properties.filter(p => p.owner_id === myPlayer.id).map(p => p.property_key)
    const ownsEnough = PROPERTY_GROUPS[def.group].filter(k => ownerProps.includes(k)).length >= 2
    if (!ownsEnough) { setModal({ type: 'error', msg: 'Necesitas al menos 2 propiedades del mismo grupo' }); return }
    const cost = def.buildCosts[prop.level]
    if (myPlayer.money < cost) { setModal({ type: 'error', msg: `No tienes suficiente. Necesitas ${formatMoney(cost)}` }); return }
    await supabase.from('game_properties').update({ level: prop.level + 1 }).eq('id', prop.id)
    await supabase.from('game_players').update({ money: myPlayer.money - cost }).eq('id', myPlayer.id)
    addLog(`${name(myPlayer)} construye ${LEVEL_NAMES[prop.level + 1]} en ${def.name}`)
    await loadAll()
  }

  async function endTurn() {
    const active = players.filter(p => !p.is_bankrupt)
    const ci = active.findIndex(p => p.id === gameState?.current_player_id)
    const next = active[(ci + 1) % active.length]
    const newRound = (ci + 1) % active.length === 0 ? (gameState?.current_round || 1) + 1 : gameState?.current_round || 1
    for (const p of players) { if (calculateNetWorth(p, properties) >= 1000000) { setModal({ type: 'winner', player: p }); await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', roomId); return } }
    await supabase.from('game_state').update({ current_player_id: next.id, current_turn: (gameState?.current_turn || 1) + 1, current_round: newRound, phase: 'roll', log: [...(gameState?.log as any[] || []), ...log.map(l => ({ action: l, timestamp: new Date().toISOString() }))].slice(-50) }).eq('room_id', roomId)
  }

  function addLog(msg: string) { setLog(prev => [msg, ...prev].slice(0, 30)) }
  function name(p: any) { return p?.profiles?.username || 'Jugador' }

  const diceFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' }

  const allSquares = [
    ...PROPERTIES.map(p => ({ ...p, isProperty: true })),
    ...SPECIAL_SQUARES.map(s => ({ ...s, isProperty: false }))
  ].sort((a, b) => a.position - b.position)

  const top = allSquares.filter(s => s.position >= 19 && s.position <= 28).sort((a, b) => b.position - a.position)
  const right = allSquares.filter(s => s.position >= 10 && s.position <= 18).sort((a, b) => b.position - a.position)
  const bottom = allSquares.filter(s => s.position >= 1 && s.position <= 9).sort((a, b) => a.position - b.position)
  const left = allSquares.filter(s => s.position >= 29 || s.position === 29 || s.position >= 29).filter(s => s.position >= 29 && s.position <= 37).sort((a, b) => a.position - b.position)

  if (!mounted || loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b' }}><p style={{ color: '#71717a' }}>Cargando partida...</p></div>

  const currentPlayer = players.find(p => p.id === gameState?.current_player_id)
  const myProps = properties.filter(p => p.owner_id === myPlayer?.id)

  return (
    <main style={{ background: '#09090b', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .board-sq:hover .sq-tooltip { display: block !important; }
        .board-sq:hover { filter: brightness(1.05); }
      `}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100vh' }}>

        <div style={{ width: '200px', background: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', padding: '12px', overflowY: 'auto', flexShrink: 0 }}>
          <h2 style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.1rem', marginBottom: '6px' }}>Iberiópolis</h2>
          <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '10px' }}>Ronda {gameState?.current_round} · Turno {gameState?.current_turn}</div>
          {players.map((p, i) => {
            const nw = calculateNetWorth(p, properties)
            const isCurrent = p.id === gameState?.current_player_id
            return (
              <div key={p.id} style={{ marginBottom: '8px', padding: '8px', borderRadius: '8px', background: isCurrent ? '#27272a' : '#18181b', border: isCurrent ? `1px solid ${PLAYER_COLORS[i]}` : '1px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PLAYER_COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name(p)}</span>
                  {isCurrent && <span style={{ color: '#f59e0b', fontSize: '10px' }}>▶</span>}
                </div>
                <div style={{ fontSize: '11px', color: ROLES_DEF[p.role as Role]?.textColor }}>{ROLES_DEF[p.role as Role]?.name}</div>
                <div style={{ fontSize: '12px', color: '#d4d4d8', marginTop: '2px' }}>{formatMoney(p.money)}</div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>Pat: {formatMoney(nw)}</div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>Casilla: {p.position}</div>
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '760px', aspectRatio: '1', display: 'grid', gridTemplateColumns: '100px repeat(9, 1fr) 100px', gridTemplateRows: '100px repeat(7, 1fr) 100px', gap: '3px', background: '#1a1a2e', borderRadius: '16px', padding: '8px' }}>

              <div style={{ gridColumn: 1, gridRow: 1 }}><CornerSquare type="vacaciones" players={players} /></div>
              {top.map((sq, i) => {
                const propState = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: i + 2, gridRow: 1 }}>
                  <BoardSquare sq={sq} propState={propState} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} position="top" side="top" />
                </div>
              })}
              <div style={{ gridColumn: 11, gridRow: 1 }}><CornerSquare type="libre" players={players} /></div>

              {right.map((sq, i) => {
                const propState = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 11, gridRow: i + 2 }}>
                  <BoardSquare sq={sq} propState={propState} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} position="right" side="left" />
                </div>
              })}

              <div style={{ gridColumn: '2 / 11', gridRow: '2 / 9', background: '#1e1e38', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #3a3a60' }}>
                <div style={{ fontSize: '26px', fontWeight: 500, color: '#f59e0b', letterSpacing: '-0.5px' }}>Iberiópolis</div>
                <div style={{ fontSize: '12px', color: '#7070a0' }}>El Monopoly español</div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
                  {Object.entries(GROUP_COLORS).map(([g, c]) => (
                    <div key={g} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#9090b0' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: c.band }} />
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#f59e0b', opacity: .6 }}>Objetivo: €1.000.000 patrimonio neto</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                  {players.map((p, i) => (
                    <div key={p.id} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', background: PLAYER_COLORS[i], boxShadow: '0 2px 5px rgba(0,0,0,.6)' }}>
                      {name(p)[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ gridColumn: 11, gridRow: 9 }}><CornerSquare type="juzgado" players={players} /></div>

              {[...bottom].reverse().map((sq, i) => {
                const propState = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 10 - i, gridRow: 9 }}>
                  <BoardSquare sq={sq} propState={propState} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} position="bottom" side="bottom" />
                </div>
              })}

              <div style={{ gridColumn: 1, gridRow: 9 }}><CornerSquare type="salida" players={players} /></div>

              {[...left].reverse().map((sq, i) => {
                const propState = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 1, gridRow: 8 - i }}>
                  <BoardSquare sq={sq} propState={propState} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} position="left" side="right" />
                </div>
              })}

            </div>
          </div>

          <div style={{ borderTop: '1px solid #27272a', padding: '12px 16px', background: '#18181b', flexShrink: 0 }}>
            {myPlayer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Tu dinero</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{formatMoney(myPlayer.money)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Casilla</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{myPlayer.position}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Turno de</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{currentPlayer ? name(currentPlayer) : '—'}</div>
                </div>
               {diceAnim.length > 0 && (
  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
    {diceAnim.map((d, i) => (
      <div key={i} style={{
        width: '52px', height: '52px', background: 'white', borderRadius: '12px',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr',
        padding: '7px', gap: '3px',
        boxShadow: rolling ? '0 0 20px rgba(245,158,11,0.8), 0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.5)',
        border: rolling ? '2px solid #f59e0b' : '2px solid #e5e5e5',
        transition: 'all 0.1s',
        transform: rolling ? `rotate(${Math.random() * 30 - 15}deg)` : 'rotate(0deg)',
      }}>
        {[
          [false, false, false, false, d >= 1, false, false, false, false],
          [d >= 6, false, false, false, false, false, false, false, d >= 2],
          [d >= 4, false, false, false, d === 5, false, false, false, d >= 4],
          [d >= 2, false, false, false, false, false, false, false, d >= 6],
          [false, false, false, false, d >= 1, false, false, false, false],
        ][0].map((_, pi) => {
          const dots: boolean[] = [
            [1,2,3,4,5,6].includes(d) && [4].includes(pi),
            [6].includes(d) && [0].includes(pi),
            [4,5,6].includes(d) && [0].includes(pi),
            [2,3,4,5,6].includes(d) && [2].includes(pi),
            [5].includes(d) && [4].includes(pi),
            [2,3,4,5,6].includes(d) && [6].includes(pi),
            [4,5,6].includes(d) && [8].includes(pi),
            [6].includes(d) && [8].includes(pi),
            [1,2,3,4,5,6].includes(d) && false,
          ]
          return <div key={pi} />
        })}
        {(() => {
          const positions: Record<number, number[]> = {
            1: [4],
            2: [2, 6],
            3: [2, 4, 6],
            4: [0, 2, 6, 8],
            5: [0, 2, 4, 6, 8],
            6: [0, 2, 3, 5, 6, 8],
          }
          return Array.from({ length: 9 }, (_, pi) => (
            <div key={pi} style={{
              borderRadius: '50%',
              background: (positions[d] || []).includes(pi) ? '#1a1a2e' : 'transparent',
              width: '100%', height: '100%',
            }} />
          ))
        })()}
      </div>
    ))}
  </div>
)}
                {isMyTurn && gameState?.phase === 'roll' && (
                  <button onClick={rollDice} disabled={rolling} style={{ background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px 28px', fontWeight: 500, cursor: 'pointer', fontSize: '14px' }}>
                    {rolling ? 'Lanzando...' : 'Tirar dados'}
                  </button>
                )}
                {!isMyTurn && <span style={{ color: '#71717a', fontSize: '14px' }}>Esperando tu turno...</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ width: '190px', background: '#18181b', borderLeft: '1px solid #27272a', padding: '12px', overflowY: 'auto', flexShrink: 0 }}>
          <h3 style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>Mis propiedades</h3>
          {myProps.length === 0 ? <p style={{ fontSize: '12px', color: '#71717a' }}>Sin propiedades aún</p> : myProps.map(p => {
            const def = PROPERTIES.find(d => d.key === p.property_key)
            if (!def) return null
            const gc = GROUP_COLORS[def.group]
            return (
              <div key={p.id} style={{ marginBottom: '8px', padding: '8px', background: '#27272a', borderRadius: '8px', fontSize: '12px', borderLeft: `3px solid ${gc.band}` }}>
                <div style={{ fontWeight: 500 }}>{def.name}</div>
                <div style={{ color: '#71717a', fontSize: '11px' }}>{LEVEL_NAMES[p.level]}</div>
                <div style={{ color: '#71717a', fontSize: '11px' }}>Renta: {formatMoney(def.rents[p.level])}</div>
              </div>
            )
          })}
          <h3 style={{ fontSize: '13px', fontWeight: 500, marginTop: '16px', marginBottom: '8px' }}>Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {log.map((e, i) => <p key={i} style={{ fontSize: '11px', color: '#71717a', lineHeight: 1.4, margin: 0 }}>{e}</p>)}
          </div>
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '90%' }}>
            {modal.type === 'buy' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>¿Comprar {modal.square.name}?</h3>
              <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '4px' }}>Precio: {formatMoney(modal.square.price)}</p>
              <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '4px' }}>Tu dinero: {formatMoney(myPlayer?.money || 0)}</p>
              <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '16px' }}>Renta base: {formatMoney(modal.square.rents[0])}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => buyProperty(modal.square)} style={{ flex: 1, background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 500, cursor: 'pointer' }}>Comprar</button>
                <button onClick={async () => { setModal(null); await endTurn() }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Pasar</button>
              </div>
            </>}
            {modal.type === 'card' && <>
              <div style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px', background: modal.card.subtype === 'ofensiva' ? '#450a0a' : modal.card.subtype === 'beneficiosa' ? '#14532d' : modal.card.subtype === 'caos' ? '#2e1065' : '#27272a', color: modal.card.subtype === 'ofensiva' ? '#fca5a5' : modal.card.subtype === 'beneficiosa' ? '#86efac' : modal.card.subtype === 'caos' ? '#d8b4fe' : '#d4d4d8' }}>{modal.card.subtype}</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>{modal.card.name}</h3>
              <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '16px' }}>{modal.card.description}</p>
              {modal.card.storable ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={async () => { await supabase.from('game_cards').insert({ room_id: roomId, player_id: myPlayer?.id, card_key: modal.card.key, card_type: 'escandalo' }); addLog(`${name(myPlayer)} guarda "${modal.card.name}"`); setModal(null); await endTurn() }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Guardar</button>
                  <button onClick={async () => { setModal(null); await endTurn() }} style={{ flex: 1, background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 500, cursor: 'pointer' }}>Aplicar</button>
                </div>
              ) : (
                <button onClick={async () => { setModal(null); await endTurn() }} style={{ width: '100%', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 500, cursor: 'pointer' }}>Continuar</button>
              )}
            </>}
            {modal.type === 'winner' && <>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>¡{name(modal.player)} gana!</h3>
              <p style={{ color: '#71717a', marginBottom: '16px' }}>Ha alcanzado €1.000.000 de patrimonio neto</p>
              <button onClick={() => { window.location.href = '/lobby' }} style={{ width: '100%', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px', fontWeight: 500, cursor: 'pointer' }}>Volver al lobby</button>
            </>}
            {modal.type === 'ere' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>ERE Express</h3>
              <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '16px' }}>Muévete gratis a una Startup o Servicio</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={async () => { const t = PROPERTIES.filter(p => p.group === 'startup')[Math.floor(Math.random() * 4)]; await supabase.from('game_players').update({ position: t.position }).eq('id', myPlayer?.id); addLog(`${name(myPlayer)} → ${t.name}`); setModal(null); await handleSquare(t.position, myPlayer?.money || 0) }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Startup</button>
                <button onClick={async () => { const t = PROPERTIES.filter(p => p.group === 'servicios')[Math.floor(Math.random() * 4)]; await supabase.from('game_players').update({ position: t.position }).eq('id', myPlayer?.id); addLog(`${name(myPlayer)} → ${t.name}`); setModal(null); await handleSquare(t.position, myPlayer?.money || 0) }} style={{ flex: 1, background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Servicios</button>
              </div>
            </>}
            {modal.type === 'ipo' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>IPO en Bolsa</h3>
              <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '12px' }}>Elige una propiedad para +40% valor de venta</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {myProps.map(p => { const def = PROPERTIES.find(d => d.key === p.property_key); if (!def) return null; return <button key={p.id} onClick={async () => { await supabase.from('game_properties').update({ ipo_active: true }).eq('id', p.id); addLog(`${name(myPlayer)} saca a bolsa ${def.name}`); setModal(null); await endTurn() }} style={{ textAlign: 'left', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>{def.name} — {formatMoney(def.price)}</button> })}
              </div>
              <button onClick={async () => { setModal(null); await endTurn() }} style={{ width: '100%', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Pasar</button>
            </>}
            {modal.type === 'error' && <>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>Error</h3>
              <p style={{ color: '#71717a', marginBottom: '16px' }}>{modal.msg}</p>
              <button onClick={() => setModal(null)} style={{ width: '100%', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>Cerrar</button>
            </>}
          </div>
        </div>
      )}
    </main>
  )
}