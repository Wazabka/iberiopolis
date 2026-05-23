'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLES_DEF, PLAYER_COLORS } from '@/lib/gameData'
import { Role } from '@/types/game'

export default function GameRoom() {
  const router = useRouter()
  const params = useParams()
  const roomId = params.id as string
  const [user, setUser] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [myPlayer, setMyPlayer] = useState<any>(null)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    checkUser()
  }, [mounted])

  useEffect(() => {
    if (!roomId) return
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `room_id=eq.${roomId}`
      }, () => loadRoom())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_rooms',
        filter: `id=eq.${roomId}`
      }, (payload: any) => {
        if (payload.new?.status === 'playing') {
          router.push(`/game/${roomId}/play`)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    await loadRoom(user.id)
  }

  async function loadRoom(userId?: string) {
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    setRoom(roomData)

    if (roomData?.status === 'playing') {
      router.push(`/game/${roomId}/play`)
      return
    }

    const { data: playersData } = await supabase
      .from('game_players')
      .select('*, profiles(username, avatar_url)')
      .eq('room_id', roomId)
      .order('turn_order')
    setPlayers(playersData || [])

    const uid = userId || user?.id
    if (uid && playersData) {
      const me = playersData.find((p: any) => p.user_id === uid)
      setMyPlayer(me)
      if (me?.role) setSelectedRole(me.role)
    }
    setLoading(false)
  }

  async function selectRole(role: Role) {
    if (!myPlayer) return
    const taken = players.find(p => p.role === role && p.user_id !== user?.id)
    if (taken) { setError('Ese rol ya está cogido'); return }
    setSelectedRole(role)
    setError('')
    await supabase.from('game_players').update({ role }).eq('id', myPlayer.id)
    await loadRoom()
  }

  async function leaveRoom() {
    if (myPlayer) {
      await supabase.from('game_players').delete().eq('id', myPlayer.id)
      const { data: remaining } = await supabase
        .from('game_players')
        .select('id')
        .eq('room_id', roomId)
      if (!remaining || remaining.length === 0) {
        await supabase.from('game_rooms').update({ status: 'finished' }).eq('id', roomId)
      }
    }
    router.push('/lobby')
  }

  async function startGame() {
    if (players.length < 2) { setError('Necesitas al menos 2 jugadores'); return }
    if (players.some(p => !p.role)) { setError('Todos los jugadores deben elegir un rol'); return }
    setStarting(true)
    setError('')
    try {
      const shuffled = [...players].sort(() => Math.random() - 0.5)
      for (let i = 0; i < shuffled.length; i++) {
        await supabase.from('game_players').update({ turn_order: i }).eq('id', shuffled[i].id)
      }
      const { error: gsError } = await supabase.from('game_state').upsert({
        room_id: roomId,
        current_player_id: shuffled[0].id,
        current_turn: 1,
        current_round: 1,
        phase: 'roll',
        dice_result: [],
        log: [],
      }, { onConflict: 'room_id' })
      if (gsError) throw gsError
      const { error: roomError } = await supabase
        .from('game_rooms')
        .update({ status: 'playing' })
        .eq('id', roomId)
      if (roomError) throw roomError
      router.push(`/game/${roomId}/play`)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar la partida')
      setStarting(false)
    }
  }

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#71717a' }}>Cargando sala...</p>
    </div>
  )

  const isHost = room?.host_id === user?.id
  const roles = Object.entries(ROLES_DEF) as [Role, typeof ROLES_DEF.saboteador][]

  return (
    <main style={{ minHeight: '100vh', padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b', margin: 0 }}>Sala de espera</h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Código: <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'white' }}>{room?.code}</span> — compártelo con tus amigos
          </p>
        </div>
        <button onClick={leaveRoom} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>Salir</button>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: '500', fontSize: '1rem', marginBottom: '0.75rem' }}>
              Jugadores ({players.length}/5)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {players.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#27272a', borderRadius: '8px', padding: '8px 12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PLAYER_COLORS[i], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.profiles?.username || 'Jugador'}
                  </span>
                  {p.role ? (
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: ROLES_DEF[p.role as Role]?.color, color: ROLES_DEF[p.role as Role]?.textColor, whiteSpace: 'nowrap' }}>
                      {ROLES_DEF[p.role as Role]?.name}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Sin rol</span>
                  )}
                  {room?.host_id === p.user_id && (
                    <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Host</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={starting}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {starting ? 'Iniciando...' : 'Iniciar partida'}
            </button>
          ) : (
            <p style={{ color: '#71717a', fontSize: '0.875rem', textAlign: 'center' }}>
              Esperando al host para iniciar...
            </p>
          )}
        </div>

        <div>
          <h2 style={{ fontWeight: '500', fontSize: '1rem', marginBottom: '0.75rem' }}>Elige tu rol</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {roles.map(([key, def]) => {
              const taken = players.find(p => p.role === key && p.user_id !== user?.id)
              const selected = selectedRole === key
              return (
                <button
                  key={key}
                  onClick={() => !taken && selectRole(key)}
                  disabled={!!taken}
                  style={{
                    textAlign: 'left',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: selected ? '2px solid #f59e0b' : '1px solid #3f3f46',
                    background: selected ? '#27272a' : '#18181b',
                    cursor: taken ? 'not-allowed' : 'pointer',
                    opacity: taken ? 0.4 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '500', padding: '2px 7px', borderRadius: '4px', background: def.color, color: def.textColor }}>
                      {def.name}
                    </span>
                    {taken && <span style={{ fontSize: '0.7rem', color: '#71717a' }}>Ocupado</span>}
                    {selected && <span style={{ fontSize: '0.7rem', color: '#f59e0b' }}>✓</span>}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#a1a1aa', lineHeight: '1.5', margin: '0 0 4px' }}>{def.passive}</p>
                  <p style={{ fontSize: '0.7rem', color: '#71717a', margin: 0 }}>
                    <span style={{ color: '#d4d4d8' }}>Activa: </span>{def.active}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}