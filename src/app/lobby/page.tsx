'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/auth'
import { formatMoney } from '@/lib/gameData'

export default function Lobby() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    checkUser()
    loadRooms()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
    setLoading(false)
  }

  async function loadRooms() {
    const { data } = await supabase
      .from('game_rooms')
      .select('*, game_players(count)')
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(10)
    setRooms(data || [])
  }

  async function createRoom() {
    setCreating(true)
    setError('')
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data, error } = await supabase
        .from('game_rooms')
        .insert({ code, host_id: user.id, status: 'waiting', max_players: 5 })
        .select()
        .single()
      if (error) throw error
      router.push(`/game/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setCreating(false)
    }
  }

  async function joinRoom(roomId: string) {
    setError('')
    try {
      const { data: existing } = await supabase
        .from('game_players')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single()
      if (!existing) {
        const { data: players } = await supabase
          .from('game_players')
          .select('id')
          .eq('room_id', roomId)
        if ((players?.length || 0) >= 5) { setError('Sala llena'); return }
        const colors = ['#E24B4A', '#378ADD', '#639922', '#BA7517', '#7F77DD']
        await supabase.from('game_players').insert({
          room_id: roomId,
          user_id: user.id,
          color: colors[players?.length || 0],
          turn_order: players?.length || 0,
        })
      }
      router.push(`/game/${roomId}`)
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function joinByCode() {
    setError('')
    if (!code.trim()) return
    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'waiting')
      .single()
    if (error || !data) { setError('Sala no encontrada'); return }
    await joinRoom(data.id)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-zinc-400">Cargando...</p>
    </div>
  )

  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 mt-4">
        <div>
          <h1 className="text-3xl font-bold text-amber-400">Iberiópolis</h1>
          <p className="text-zinc-400 text-sm">Hola, {profile?.username || user?.email}</p>
        </div>
        <button onClick={handleSignOut} className="btn btn-secondary text-sm">
          Salir
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4 card">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Crear partida</h2>
          <p className="text-zinc-400 text-sm mb-4">Crea una sala privada y comparte el código con tus amigos.</p>
          <button onClick={createRoom} disabled={creating} className="btn btn-primary w-full">
            {creating ? 'Creando...' : 'Nueva partida'}
          </button>
        </div>

        <div className="card">
          <h2 className="text-lg font-medium mb-4">Unirse con código</h2>
          <p className="text-zinc-400 text-sm mb-4">Introduce el código de 6 letras que te ha pasado el host.</p>
          <div className="flex gap-2">
            <input
              className="input flex-1 uppercase tracking-widest"
              placeholder="ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button onClick={joinByCode} className="btn btn-primary px-6">
              Entrar
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Salas abiertas</h2>
          <button onClick={loadRooms} className="text-zinc-400 hover:text-white text-sm">
            Actualizar
          </button>
        </div>
        {rooms.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-8">No hay salas abiertas. ¡Crea una!</p>
        ) : (
          <div className="space-y-2">
            {rooms.map(room => (
              <div key={room.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3">
                <div>
                  <span className="font-mono font-bold text-amber-400">{room.code}</span>
                  <span className="text-zinc-400 text-sm ml-3">
                    {room.game_players?.[0]?.count || 0}/5 jugadores
                  </span>
                </div>
                <button onClick={() => joinRoom(room.id)} className="btn btn-secondary text-sm py-1">
                  Unirse
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}