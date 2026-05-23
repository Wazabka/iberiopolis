'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ROLES_DEF, PLAYER_COLORS, formatMoney } from '@/lib/gameData'
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

  useEffect(() => {
    checkUser()
    loadRoom()
    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${roomId}` }, () => loadRoom())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, (payload: any) => {
        if (payload.new.status === 'playing') router.push(`/game/${roomId}/play`)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
  }

  async function loadRoom() {
    const { data: roomData } = await supabase.from('game_rooms').select('*').eq('id', roomId).single()
    setRoom(roomData)
    const { data: playersData } = await supabase
      .from('game_players')
      .select('*, profiles(username, avatar_url)')
      .eq('room_id', roomId)
      .order('turn_order')
    setPlayers(playersData || [])
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const me = playersData?.find((p: any) => p.user_id === user.id)
      setMyPlayer(me)
      if (me?.role) setSelectedRole(me.role)
    }
    setLoading(false)
  }

  async function selectRole(role: Role) {
    const taken = players.find(p => p.role === role && p.user_id !== user?.id)
    if (taken) { setError('Ese rol ya está cogido'); return }
    setSelectedRole(role)
    setError('')
    await supabase.from('game_players').update({ role }).eq('id', myPlayer.id)
  }

  async function startGame() {
    if (players.length < 2) { setError('Necesitas al menos 2 jugadores'); return }
    if (players.some(p => !p.role)) { setError('Todos los jugadores deben elegir un rol'); return }
    setStarting(true)
    const shuffled = [...players].sort(() => Math.random() - 0.5)
    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from('game_players').update({ turn_order: i }).eq('id', shuffled[i].id)
    }
    const { data: gameState } = await supabase.from('game_state').insert({
      room_id: roomId,
      current_player_id: shuffled[0].id,
      current_turn: 1,
      current_round: 1,
      phase: 'roll',
    }).select().single()
    await supabase.from('game_rooms').update({ status: 'playing' }).eq('id', roomId)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-zinc-400">Cargando sala...</p></div>

  const isHost = room?.host_id === user?.id
  const roles = Object.entries(ROLES_DEF) as [Role, typeof ROLES_DEF.saboteador][]

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">Sala de espera</h1>
          <p className="text-zinc-400 text-sm">Código: <span className="font-mono font-bold text-white">{room?.code}</span> — compártelo con tus amigos</p>
        </div>
        <button onClick={() => router.push('/lobby')} className="btn btn-secondary text-sm">Salir</button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-950 rounded-lg">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card mb-4">
            <h2 className="font-medium mb-3">Jugadores ({players.length}/5)</h2>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-3 py-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: PLAYER_COLORS[i] }} />
                  <span className="text-sm flex-1">{p.profiles?.username || 'Jugador'}</span>
                  {p.role ? (
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: ROLES_DEF[p.role as Role]?.color, color: ROLES_DEF[p.role as Role]?.textColor }}>
                      {ROLES_DEF[p.role as Role]?.name}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">Sin rol</span>
                  )}
                  {room?.host_id === p.user_id && <span className="text-xs text-amber-400">Host</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <button onClick={startGame} disabled={starting} className="btn btn-primary w-full">
              {starting ? 'Iniciando...' : 'Iniciar partida'}
            </button>
          )}
          {!isHost && <p className="text-zinc-500 text-sm text-center">Esperando al host...</p>}
        </div>

        <div className="lg:col-span-2">
          <h2 className="font-medium mb-3">Elige tu rol</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.map(([key, def]) => {
              const taken = players.find(p => p.role === key && p.user_id !== user?.id)
              const selected = selectedRole === key
              return (
                <button
                  key={key}
                  onClick={() => !taken && selectRole(key)}
                  disabled={!!taken}
                  className={`text-left p-4 rounded-xl border transition-all ${selected ? 'border-amber-400 bg-zinc-800' : taken ? 'border-zinc-800 opacity-40 cursor-not-allowed' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: def.color, color: def.textColor }}>
                      {def.name}
                    </span>
                    {taken && <span className="text-xs text-zinc-500">Ocupado</span>}
                    {selected && <span className="text-xs text-amber-400">Seleccionado</span>}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{def.passive}</p>
                  <p className="text-xs text-zinc-500 mt-1"><span className="text-zinc-300">Activa:</span> {def.active}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </main>
  )
}