'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PROPERTIES, SPECIAL_SQUARES, ROLES_DEF, PLAYER_COLORS, formatMoney, getSquareAtPosition, calculateRent, calculateNetWorth, TOTAL_SQUARES, ESCANDALO_CARDS, SUBVENCION_CARDS, PROPERTY_GROUPS } from '@/lib/gameData'
import { Player, Property, GameState, Role } from '@/types/game'

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
    if (passedGo) {
      newMoney += 20000
      addLog(`${getPlayerName(myPlayer!)} pasa por la Salida +€20.000`)
    }
    await supabase.from('game_players').update({ position: newPos, money: newMoney }).eq('id', myPlayer!.id)
    await supabase.from('game_state').update({ dice_result: [d1, d2], phase: 'action' }).eq('room_id', roomId)
    addLog(`${getPlayerName(myPlayer!)} saca ${d1}+${d2}=${total}`)
    await handleSquare(newPos, newMoney)
    setRolling(false)
  }

  async function handleSquare(pos: number, currentMoney: number) {
    const square = getSquareAtPosition(pos)
    if (!square) { await endTurn(); return }
    if ('price' in square) {
      const prop = properties.find(p => p.property_key === square.key)
      if (!prop || !prop.owner_id) {
        setModal({ type: 'buy', square, prop })
      } else if (prop.owner_id !== myPlayer!.id) {
        const owner = players.find(p => p.id === prop.owner_id)
        if (!owner) { await endTurn(); return }
        const ownerProps = properties.filter(p => p.owner_id === owner.id).map(p => p.property_key)
        let rent = calculateRent(square, prop.level, ownerProps, prop.bubble_active, gameState?.ipc_bonus || false, owner.role)
        if (myPlayer!.role === 'sindicalista') rent = Math.floor(rent * 0.7)
        const newMoney = currentMoney - rent
        const ownerMoney = owner.money + rent
        await supabase.from('game_players').update({ money: newMoney }).eq('id', myPlayer!.id)
        await supabase.from('game_players').update({ money: ownerMoney }).eq('id', owner.id)
        addLog(`${getPlayerName(myPlayer!)} paga ${formatMoney(rent)} a ${getPlayerName(owner)}`)
        await endTurn()
      } else {
        await endTurn()
      }
    } else {
      await handleSpecialSquare(square, currentMoney)
    }
  }

  async function handleSpecialSquare(square: any, currentMoney: number) {
    switch (square.type) {
      case 'hacienda': {
        const tax = Math.floor(currentMoney * (myPlayer!.role === 'asesor' ? 0.098 : 0.15))
        await supabase.from('game_players').update({ money: currentMoney - tax }).eq('id', myPlayer!.id)
        addLog(`${getPlayerName(myPlayer!)} paga ${formatMoney(tax)} a Hacienda`)
        await endTurn(); break
      }
      case 'juzgado': {
        await supabase.from('game_players').update({ in_jail: true, jail_turns: 0 }).eq('id', myPlayer!.id)
        addLog(`${getPlayerName(myPlayer!)} va al Juzgado`)
        await endTurn(); break
      }
      case 'siesta': {
        await supabase.from('game_players').update({ money: currentMoney + 5000 }).eq('id', myPlayer!.id)
        addLog(`${getPlayerName(myPlayer!)} hace la Siesta +€5.000`)
        await endTurn(); break
      }
      case 'vacaciones': {
        await supabase.from('game_players').update({ money: currentMoney + 10000 }).eq('id', myPlayer!.id)
        addLog(`${getPlayerName(myPlayer!)} de vacaciones +€10.000`)
        await endTurn(); break
      }
      case 'subvencion': {
        await supabase.from('game_players').update({ money: currentMoney + 40000 }).eq('id', myPlayer!.id)
        addLog(`${getPlayerName(myPlayer!)} recibe Subvención +€40.000`)
        await endTurn(); break
      }
      case 'inspeccion': {
        const richest = [...players].sort((a, b) => b.money - a.money)[0]
        await supabase.from('game_players').update({ money: richest.money - 15000 }).eq('id', richest.id)
        addLog(`Inspección: ${getPlayerName(richest)} paga €15.000`)
        await endTurn(); break
      }
      case 'escandalo': {
        const card = ESCANDALO_CARDS[Math.floor(Math.random() * ESCANDALO_CARDS.length)]
        setModal({ type: 'card', card, cardMoney: currentMoney })
        break
      }
      case 'ere': {
        setModal({ type: 'ere' }); break
      }
      case 'ipo': {
        setModal({ type: 'ipo' }); break
      }
      default:
        await endTurn()
    }
  }

  async function buyProperty(square: any) {
    if (!myPlayer || myPlayer.money < square.price) { setModal(null); await endTurn(); return }
    const existing = properties.find(p => p.property_key === square.key)
    if (existing) {
      await supabase.from('game_properties').update({ owner_id: myPlayer.id }).eq('id', existing.id)
    } else {
      await supabase.from('game_properties').insert({ room_id: roomId, property_key: square.key, owner_id: myPlayer.id, level: 0 })
    }
    let price = square.price
    if (myPlayer.role === 'asesor') price = Math.floor(price * 0.8)
    await supabase.from('game_players').update({ money: myPlayer.money - price }).eq('id', myPlayer.id)
    addLog(`${getPlayerName(myPlayer)} compra ${square.name} por ${formatMoney(price)}`)
    setModal(null)
    await endTurn()
  }

  async function buildImprovement(propertyKey: string) {
    const prop = properties.find(p => p.property_key === propertyKey)
    const def = PROPERTIES.find(p => p.key === propertyKey)
    if (!prop || !def || !myPlayer) return
    if (prop.level >= 3) return
    const groupKeys = PROPERTY_GROUPS[def.group]
    const ownerProps = properties.filter(p => p.owner_id === myPlayer.id).map(p => p.property_key)
    const ownsEnough = groupKeys.filter(k => ownerProps.includes(k)).length >= 2
    if (!ownsEnough) { setModal({ type: 'error', msg: 'Necesitas al menos 2 propiedades del mismo grupo' }); return }
    const cost = def.buildCosts[prop.level]
    if (myPlayer.money < cost) { setModal({ type: 'error', msg: `No tienes suficiente. Necesitas ${formatMoney(cost)}` }); return }
    await supabase.from('game_properties').update({ level: prop.level + 1 }).eq('id', prop.id)
    await supabase.from('game_players').update({ money: myPlayer.money - cost }).eq('id', myPlayer.id)
    const levels = ['Oficina', 'Sede Regional', 'Holding Nacional']
    addLog(`${getPlayerName(myPlayer)} construye ${levels[prop.level]} en ${def.name}`)
    await loadAll()
  }

  async function endTurn() {
    const activePlayers = players.filter(p => !p.is_bankrupt)
    const currentIndex = activePlayers.findIndex(p => p.id === gameState?.current_player_id)
    const nextIndex = (currentIndex + 1) % activePlayers.length
    const nextPlayer = activePlayers[nextIndex]
    const newRound = nextIndex === 0 ? (gameState?.current_round || 1) + 1 : gameState?.current_round || 1
    for (const player of players) {
      const netWorth = calculateNetWorth(player, properties)
      if (netWorth >= 1000000) {
        setModal({ type: 'winner', player })
        await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', roomId)
        return
      }
    }
    const newLog = [...(gameState?.log as any[] || []), ...log.map(l => ({ action: l, timestamp: new Date().toISOString() }))]
    await supabase.from('game_state').update({
      current_player_id: nextPlayer.id,
      current_turn: (gameState?.current_turn || 1) + 1,
      current_round: newRound,
      phase: 'roll',
      log: newLog.slice(-50),
    }).eq('room_id', roomId)
  }

  function addLog(msg: string) {
    setLog(prev => [msg, ...prev].slice(0, 30))
  }

  function getPlayerName(player: any) {
    return (player as any)?.profiles?.username || 'Jugador'
  }

  const diceFaces: Record<number, string> = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' }

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#71717a' }}>Cargando partida...</p>
    </div>
  )

  const currentPlayer = players.find(p => p.id === gameState?.current_player_id)
  const myProps = properties.filter(p => p.owner_id === myPlayer?.id)

  return (
    <main style={{ background: '#09090b', minHeight: '100vh', color: 'white' }}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

        <div style={{ width: '220px', background: '#18181b', borderRight: '1px solid #27272a', display: 'flex', flexDirection: 'column', padding: '12px', overflowY: 'auto', flexShrink: 0 }}>
          <h2 style={{ color: '#f59e0b', fontWeight: '700', fontSize: '1.1rem', marginBottom: '8px' }}>Iberiópolis</h2>
          <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '12px' }}>Ronda {gameState?.current_round} · Turno {gameState?.current_turn}</div>
          {players.map((p, i) => {
            const netWorth = calculateNetWorth(p, properties)
            const isCurrent = p.id === gameState?.current_player_id
            return (
              <div key={p.id} style={{ marginBottom: '8px', padding: '8px', borderRadius: '8px', background: isCurrent ? '#27272a' : '#18181b', border: isCurrent ? '1px solid #f59e0b' : '1px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PLAYER_COLORS[i] }} />
                  <span style={{ fontSize: '12px', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPlayerName(p)}</span>
                  {isCurrent && <span style={{ color: '#f59e0b', fontSize: '10px' }}>▶</span>}
                </div>
                <div style={{ fontSize: '11px', color: ROLES_DEF[p.role as Role]?.textColor }}>{ROLES_DEF[p.role as Role]?.name}</div>
                <div style={{ fontSize: '12px', color: '#d4d4d8', marginTop: '2px' }}>{formatMoney(p.money)}</div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>Pat: {formatMoney(netWorth)}</div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>Casilla: {p.position}</div>
              </div>
            )
          })}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {PROPERTIES.map(prop => {
                const state = properties.find(p => p.property_key === prop.key)
                const owner = state?.owner_id ? players.find(p => p.id === state.owner_id) : null
                const ownerIdx = owner ? players.findIndex(p => p.id === owner.id) : -1
                const groupColors: Record<string, string> = { startup: '#185FA5', servicios: '#854F0B', corporacion: '#993C1D', monopolio: '#A32D2D' }
                const levelNames = ['', 'Oficina', 'Sede', 'Holding']
                return (
                  <div key={prop.key} style={{ background: '#18181b', borderRadius: '8px', padding: '8px', border: '1px solid #27272a', fontSize: '12px' }}>
                    <div style={{ height: '3px', borderRadius: '2px', marginBottom: '6px', background: groupColors[prop.group] }} />
                    <div style={{ fontWeight: '500', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prop.name}</div>
                    <div style={{ color: '#71717a', fontSize: '11px' }}>{formatMoney(prop.price)}</div>
                    {owner ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: PLAYER_COLORS[ownerIdx] }} />
                        <span style={{ color: '#a1a1aa', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPlayerName(owner)}</span>
                        {state && state.level > 0 && <span style={{ color: groupColors[prop.group], fontSize: '10px' }}>{levelNames[state.level]}</span>}
                      </div>
                    ) : (
                      <div style={{ color: '#52525b', fontSize: '11px', marginTop: '4px' }}>Libre</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #27272a', padding: '16px', background: '#18181b' }}>
            {myPlayer && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Tu dinero</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>{formatMoney(myPlayer.money)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Casilla</div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{myPlayer.position}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>Turno de</div>
                  <div style={{ fontSize: '14px', fontWeight: '500' }}>{currentPlayer ? getPlayerName(currentPlayer) : '—'}</div>
                </div>
                {diceAnim.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '2rem' }}>{diceFaces[diceAnim[0]]}</span>
                    <span style={{ fontSize: '2rem' }}>{diceFaces[diceAnim[1]]}</span>
                  </div>
                )}
                {isMyTurn && gameState?.phase === 'roll' && (
                  <button onClick={rollDice} disabled={rolling} className="btn btn-primary" style={{ padding: '8px 32px' }}>
                    {rolling ? 'Lanzando...' : 'Tirar dados'}
                  </button>
                )}
                {!isMyTurn && <span style={{ color: '#71717a', fontSize: '14px' }}>Esperando tu turno...</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ width: '200px', background: '#18181b', borderLeft: '1px solid #27272a', padding: '12px', overflowY: 'auto', flexShrink: 0 }}>
          <h3 style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Mis propiedades</h3>
          {myProps.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#71717a' }}>Sin propiedades</p>
          ) : (
            myProps.map(p => {
              const def = PROPERTIES.find(d => d.key === p.property_key)
              if (!def) return null
              const levels = ['Sin mejora', 'Oficina', 'Sede Regional', 'Holding Nacional']
              const canBuild = p.level < 3 && isMyTurn
              return (
                <div key={p.id} style={{ marginBottom: '8px', padding: '8px', background: '#27272a', borderRadius: '8px', fontSize: '12px' }}>
                  <div style={{ fontWeight: '500' }}>{def.name}</div>
                  <div style={{ color: '#71717a', fontSize: '11px' }}>{levels[p.level]}</div>
                  <div style={{ color: '#71717a', fontSize: '11px' }}>Renta: {formatMoney(def.rents[p.level])}</div>
                  {canBuild && (
                    <button onClick={() => buildImprovement(p.property_key)} style={{ marginTop: '4px', fontSize: '11px', color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      Mejorar ({formatMoney(def.buildCosts[p.level])})
                    </button>
                  )}
                </div>
              )
            })
          )}
          <h3 style={{ fontSize: '13px', fontWeight: '500', marginTop: '16px', marginBottom: '8px' }}>Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {log.map((entry, i) => (
              <p key={i} style={{ fontSize: '11px', color: '#71717a', lineHeight: '1.4', margin: 0 }}>{entry}</p>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem', maxWidth: '400px', width: '90%' }}>
            {modal.type === 'buy' && (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>¿Comprar {modal.square.name}?</h3>
                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '4px' }}>Precio: {formatMoney(modal.square.price)}</p>
                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '4px' }}>Tu dinero: {formatMoney(myPlayer?.money || 0)}</p>
                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '16px' }}>Renta base: {formatMoney(modal.square.rents[0])}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => buyProperty(modal.square)} className="btn btn-primary" style={{ flex: 1 }}>Comprar</button>
                  <button onClick={async () => { setModal(null); await endTurn() }} className="btn btn-secondary" style={{ flex: 1 }}>Pasar</button>
                </div>
              </>
            )}
            {modal.type === 'card' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px', background: modal.card.subtype === 'ofensiva' ? '#450a0a' : modal.card.subtype === 'beneficiosa' ? '#14532d' : modal.card.subtype === 'caos' ? '#2e1065' : '#27272a', color: modal.card.subtype === 'ofensiva' ? '#fca5a5' : modal.card.subtype === 'beneficiosa' ? '#86efac' : modal.card.subtype === 'caos' ? '#d8b4fe' : '#d4d4d8' }}>
                  {modal.card.subtype}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>{modal.card.name}</h3>
                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '16px' }}>{modal.card.description}</p>
                {modal.card.storable ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={async () => {
                      await supabase.from('game_cards').insert({ room_id: roomId, player_id: myPlayer?.id, card_key: modal.card.key, card_type: 'escandalo' })
                      addLog(`${getPlayerName(myPlayer)} guarda "${modal.card.name}"`)
                      setModal(null); await endTurn()
                    }} className="btn btn-secondary" style={{ flex: 1 }}>Guardar</button>
                    <button onClick={async () => { setModal(null); await endTurn() }} className="btn btn-primary" style={{ flex: 1 }}>Aplicar</button>
                  </div>
                ) : (
                  <button onClick={async () => { setModal(null); await endTurn() }} className="btn btn-primary" style={{ width: '100%' }}>Continuar</button>
                )}
              </>
            )}
            {modal.type === 'winner' && (
              <>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>¡{getPlayerName(modal.player)} gana!</h3>
                <p style={{ color: '#71717a', marginBottom: '16px' }}>Ha alcanzado €1.000.000 de patrimonio neto</p>
                <button onClick={() => { window.location.href = '/lobby' }} className="btn btn-primary" style={{ width: '100%' }}>Volver al lobby</button>
              </>
            )}
            {modal.type === 'ere' && (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>ERE Express</h3>
                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '16px' }}>Muévete gratis a una Startup o Servicio</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={async () => {
                    const startups = PROPERTIES.filter(p => p.group === 'startup')
                    const target = startups[Math.floor(Math.random() * startups.length)]
                    await supabase.from('game_players').update({ position: target.position }).eq('id', myPlayer?.id)
                    addLog(`${getPlayerName(myPlayer)} → ${target.name}`)
                    setModal(null); await handleSquare(target.position, myPlayer?.money || 0)
                  }} className="btn btn-secondary" style={{ flex: 1 }}>Startup</button>
                  <button onClick={async () => {
                    const servicios = PROPERTIES.filter(p => p.group === 'servicios')
                    const target = servicios[Math.floor(Math.random() * servicios.length)]
                    await supabase.from('game_players').update({ position: target.position }).eq('id', myPlayer?.id)
                    addLog(`${getPlayerName(myPlayer)} → ${target.name}`)
                    setModal(null); await handleSquare(target.position, myPlayer?.money || 0)
                  }} className="btn btn-secondary" style={{ flex: 1 }}>Servicios</button>
                </div>
              </>
            )}
            {modal.type === 'ipo' && (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>IPO en Bolsa</h3>
                <p style={{ color: '#71717a', fontSize: '14px', marginBottom: '12px' }}>Elige una propiedad para +40% valor de venta</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {myProps.map(p => {
                    const def = PROPERTIES.find(d => d.key === p.property_key)
                    if (!def) return null
                    return (
                      <button key={p.id} onClick={async () => {
                        await supabase.from('game_properties').update({ ipo_active: true }).eq('id', p.id)
                        addLog(`${getPlayerName(myPlayer)} saca a bolsa ${def.name}`)
                        setModal(null); await endTurn()
                      }} className="btn btn-secondary" style={{ textAlign: 'left' }}>
                        {def.name} — {formatMoney(def.price)}
                      </button>
                    )
                  })}
                </div>
                <button onClick={async () => { setModal(null); await endTurn() }} className="btn btn-secondary" style={{ width: '100%' }}>Pasar</button>
              </>
            )}
            {modal.type === 'error' && (
              <>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fca5a5', marginBottom: '8px' }}>Error</h3>
                <p style={{ color: '#71717a', marginBottom: '16px' }}>{modal.msg}</p>
                <button onClick={() => setModal(null)} className="btn btn-secondary" style={{ width: '100%' }}>Cerrar</button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}