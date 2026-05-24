'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PROPERTIES, SPECIAL_SQUARES, ROLES_DEF, PLAYER_COLORS, formatMoney, getSquareAtPosition, calculateRent, calculateNetWorth, TOTAL_SQUARES, ESCANDALO_CARDS, PROPERTY_GROUPS } from '@/lib/gameData'
import { Player, Property, GameState, Role } from '@/types/game'
import { XP_REWARDS, calculateLevel, getTitle, LEVEL_COLORS, COSMETICS } from '@/lib/xp'

const GROUP_COLORS: Record<string, { bg: string; band: string; text: string }> = {
  startup:     { bg: '#d6e8f7', band: '#185FA5', text: '#185FA5' },
  servicios:   { bg: '#cce8d2', band: '#3B6D11', text: '#3B6D11' },
  corporacion: { bg: '#fce8cc', band: '#854F0B', text: '#854F0B' },
  monopolio:   { bg: '#fad6d6', band: '#A32D2D', text: '#A32D2D' },
}
const LEVEL_NAMES = ['Sin mejora', 'Oficina', 'Sede Regional', 'Holding Nacional']

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  const DOT_POSITIONS: Record<number, number[][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  }
  const dots = DOT_POSITIONS[value] || []
  return (
    <div style={{
      width: '56px', height: '56px', background: '#f0f0f0', borderRadius: '10px',
      position: 'relative', flexShrink: 0,
      boxShadow: rolling
        ? '0 0 0 2px #f59e0b, 0 0 20px rgba(245,158,11,0.7), 0 4px 12px rgba(0,0,0,0.5)'
        : '0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.8)',
      border: rolling ? '2px solid #f59e0b' : '2px solid #d0d0d0',
      transition: 'box-shadow 0.1s, border 0.1s',
      animation: rolling ? 'diceShake 0.1s infinite' : 'none',
    }}>
      {dots.map(([cx, cy], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '10px', height: '10px',
          borderRadius: '50%',
          background: '#1a1a2e',
          top: `${cy}%`, left: `${cx}%`,
          transform: 'translate(-50%, -50%)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        }} />
      ))}
    </div>
  )
}

function BoardSquare({ sq, propState, players, myPlayer, isMyTurn, onBuild, tooltipDir }: {
  sq: any, propState?: Property, players: Player[], myPlayer: Player | null,
  isMyTurn: boolean, onBuild?: (key: string) => void, tooltipDir: 'top' | 'bottom' | 'left' | 'right'
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
    hacienda:   'Pagas el 15% de tu efectivo al banco. El Asesor Fiscal solo paga el 9,8%.',
    escandalo:  'Roba una carta del mazo rojo y aplica su efecto.',
    subvencion: 'Cobras dinero del banco sin condiciones.',
    inspeccion: 'El jugador con más propiedades paga €15.000 al banco.',
    siesta:     'Pierdes un turno pero cobras €5.000 del banco.',
    vacaciones: 'Pierdes un turno pero cobras €10.000 del banco.',
    ere:        'Muévete gratis a cualquier Startup o Servicio.',
    ipo:        'Una propiedad tuya sube un 40% su valor de venta permanentemente.',
    juzgado:    'Paga €50.000 o saca dobles para salir.',
    libre:      'No pasa nada. Solo mirando.',
    salida:     'Cobras €20.000 cada vez que la cruzas.',
  }

  return (
    <div className="board-sq" style={{
      background: tintBg, borderRadius: '8px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start', padding: '5px', position: 'relative',
      overflow: 'visible', cursor: 'pointer', height: '100%',
    }}>
      {gc && (
        <div style={{
          position: 'absolute',
          ...(tooltipDir === 'bottom' ? { bottom: 0, left: 0, right: 0, height: '8px', borderRadius: '0 0 8px 8px' } :
             tooltipDir === 'left'   ? { top: 0, left: 0, bottom: 0, width: '8px', borderRadius: '8px 0 0 8px' } :
             tooltipDir === 'right'  ? { top: 0, right: 0, bottom: 0, width: '8px', borderRadius: '0 8px 8px 0' } :
             { top: 0, left: 0, right: 0, height: '8px', borderRadius: '8px 8px 0 0' }),
          background: gc.band, zIndex: 1,
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
                background: PLAYER_COLORS[idx],
                boxShadow: '0 2px 5px rgba(0,0,0,.6)',
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

      {/* Tooltip */}
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
            {propState && propState.level > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}><span style={{ color: '#7070a0' }}>Nivel actual</span><span style={{ fontWeight: 500, color: '#e8e8f5' }}>{LEVEL_NAMES[propState.level]}</span></div>}
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
  const [mounted, setMounted] = useState(false)
  const [xpGain, setXpGain] = useState<number | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (!mounted) return; init(); const iv = setInterval(() => loadAll(), 2000); return () => clearInterval(iv) }, [mounted])

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
    if (!stats) {
      await supabase.from('player_stats').insert({ user_id: userId, xp: amount, ...statUpdates })
      return
    }
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
    const anim = setInterval(() => {
      setDiceValues([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)])
    }, 80)
    await new Promise(r => setTimeout(r, 700))
    clearInterval(anim)
    const d1 = Math.ceil(Math.random() * 6)
    const d2 = Math.ceil(Math.random() * 6)
    const total = d1 + d2
    setDiceValues([d1, d2])
    const newPos = (myPlayer!.position + total) % TOTAL_SQUARES
    const passedGo = myPlayer!.position + total >= TOTAL_SQUARES
    let newMoney = myPlayer!.money
    if (passedGo) { newMoney += 20000; addLog(`${pname(myPlayer!)} pasa por Salida +€20.000`) }
    await supabase.from('game_players').update({ position: newPos, money: newMoney }).eq('id', myPlayer!.id)
    await supabase.from('game_state').update({ dice_result: [d1, d2], phase: 'action' }).eq('room_id', roomId)
    addLog(`${pname(myPlayer!)} saca ${d1}+${d2}=${total}`)
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
        addLog(`${pname(myPlayer!)} paga ${formatMoney(rent)} a ${pname(owner)}`)
        if (user) await awardXP(owner.user_id, XP_REWARDS.rent_collected, { rents_collected: 1 })
        await endTurn()
      } else { await endTurn() }
    } else { await handleSpecial(sq, currentMoney) }
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
        for (const other of players) { if (other.id !== p.id && other.user_id) await awardXP(other.user_id, XP_REWARDS.game_played, { games_played: 1 }) }
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

  const allSquares = [
    ...PROPERTIES.map(p => ({ ...p })),
    ...SPECIAL_SQUARES.map(s => ({ ...s }))
  ].sort((a, b) => a.position - b.position)

  // Board layout: top row pos 19-28 (right to left), right col pos 10-18 (top to bottom),
  // bottom row pos 1-9 (left to right), left col pos 29-37 (bottom to top)
  const topRow    = allSquares.filter(s => s.position >= 20 && s.position <= 28).sort((a, b) => b.position - a.position)
  const rightCol  = allSquares.filter(s => s.position >= 10 && s.position <= 18).sort((a, b) => b.position - a.position)
  const bottomRow = allSquares.filter(s => s.position >= 1  && s.position <= 9).sort((a, b) => a.position - b.position)
  const leftCol   = allSquares.filter(s => s.position >= 29 && s.position <= 37).sort((a, b) => b.position - a.position)

  if (!mounted || loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b' }}><p style={{ color: '#71717a' }}>Cargando partida...</p></div>

  const currentPlayer = players.find(p => p.id === gameState?.current_player_id)
  const myProps = properties.filter(p => p.owner_id === myPlayer?.id)

  return (
    <main style={{ background: '#09090b', minHeight: '100vh', color: 'white', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes diceShake { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
        @keyframes xpFloat { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-40px)} }
        .board-sq:hover .sq-tooltip { display: block !important; }
        .board-sq:hover { filter: brightness(1.06); }
      `}</style>

      {xpGain && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', background: '#f59e0b', color: 'black', borderRadius: '8px', padding: '6px 14px', fontWeight: 700, fontSize: '14px', zIndex: 200, animation: 'xpFloat 2s forwards', pointerEvents: 'none' }}>
          +{xpGain} XP
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100vh' }}>

        {/* Left panel — players */}
        <div style={{ width: '190px', background: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', padding: '12px', overflowY: 'auto', flexShrink: 0 }}>
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
              {/* Top-left corner */}
              <div style={{ gridColumn: 1, gridRow: 1 }}><CornerSquare type="vacaciones" players={players} /></div>

              {/* Top row */}
              {topRow.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: i + 2, gridRow: 1 }}><BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="top" /></div>
              })}

              {/* Top-right corner */}
              <div style={{ gridColumn: 11, gridRow: 1 }}><CornerSquare type="libre" players={players} /></div>

              {/* Right column */}
              {rightCol.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 11, gridRow: i + 2 }}><BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="right" /></div>
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

              {/* Bottom-right corner */}
              <div style={{ gridColumn: 11, gridRow: 9 }}><CornerSquare type="juzgado" players={players} /></div>

              {/* Bottom row (reversed) */}
              {[...bottomRow].reverse().map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 10 - i, gridRow: 9 }}><BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="bottom" /></div>
              })}

              {/* Bottom-left corner */}
              <div style={{ gridColumn: 1, gridRow: 9 }}><CornerSquare type="salida" players={players} /></div>

              {/* Left column */}
              {leftCol.map((sq, i) => {
                const ps = properties.find(p => p.property_key === sq.key)
                return <div key={sq.key} style={{ gridColumn: 1, gridRow: 8 - i }}><BoardSquare sq={sq} propState={ps} players={players} myPlayer={myPlayer} isMyTurn={!!isMyTurn} onBuild={buildImprovement} tooltipDir="left" /></div>
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

                {/* Dice */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Die value={diceValues[0]} rolling={rolling} />
                  <Die value={diceValues[1]} rolling={rolling} />
                </div>

                {isMyTurn && gameState?.phase === 'roll' && (
                  <button onClick={rollDice} disabled={rolling} style={{ background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '8px 24px', fontWeight: 600, cursor: 'pointer', fontSize: '14px', boxShadow: '0 0 12px rgba(245,158,11,0.4)' }}>
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
