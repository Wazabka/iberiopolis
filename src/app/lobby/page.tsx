'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/auth'

export default function Lobby() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    checkUser()
    loadRooms()
    const interval = setInterval(loadRooms, 10000)
    return () => clearInterval(interval)
  }, [mounted])

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
    const activeRooms = (data || []).filter((r: any) => (r.game_players?.[0]?.count || 0) > 0)
    setRooms(activeRooms)
  }

  async function createRoom() {
    setCreating(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { data, error } = await supabase
        .from('game_rooms')
        .insert({ code, host_id: user.id, status: 'waiting', max_players: 5 })
        .select()
        .single()
      if (error) throw error
      const colors = ['#E24B4A', '#378ADD', '#639922', '#BA7517', '#7F77DD']
      await supabase.from('game_players').insert({
        room_id: data.id,
        user_id: user.id,
        color: colors[0],
        turn_order: 0,
        money: 150000,
      })
      router.push(`/game/${data.id}`)
    } catch (err: any) {
      setError(err.message)
      setCreating(false)
    }
  }

  async function joinRoom(roomId: string) {
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')
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
          money: 150000,
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

  if (!mounted || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#71717a' }}>Cargando...</p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b', margin: 0 }}>Iberiópolis</h1>
          <p style={{ color: '#71717a', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Hola, {profile?.username || user?.email}
          </p>
        </div>
        <button onClick={handleSignOut} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>
        <button onClick={() => router.push('/reglas')} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'underline' }}>
  Reglas
</button>
          Cerrar sesión
        </button>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h2 style={{ fontWeight: '500', fontSize: '1rem', marginBottom: '0.5rem' }}>Crear partida</h2>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Crea una sala privada y comparte el código con tus amigos.
          </p>
          <button onClick={createRoom} disabled={creating} className="btn btn-primary" style={{ width: '100%' }}>
            {creating ? 'Creando...' : 'Nueva partida'}
          </button>
        </div>

        <div className="card">
          <h2 style={{ fontWeight: '500', fontSize: '1rem', marginBottom: '0.5rem' }}>Unirse con código</h2>
          <p style={{ color: '#71717a', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Introduce el código de 6 letras que te ha pasado el host.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input"
              placeholder="ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}
            />
            <button onClick={joinByCode} className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
              Entrar
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: '500', fontSize: '1rem', margin: 0 }}>Salas abiertas</h2>
          <button onClick={loadRooms} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: '0.875rem' }}>
            Actualizar
          </button>
        </div>
        {rooms.length === 0 ? (
          <p style={{ color: '#52525b', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
            No hay salas abiertas. ¡Crea una!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rooms.map(room => (
              <div key={room.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#27272a', borderRadius: '8px', padding: '10px 16px' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#f59e0b' }}>{room.code}</span>
                  <span style={{ color: '#71717a', fontSize: '0.875rem', marginLeft: '12px' }}>
                    {room.game_players?.[0]?.count || 0}/5 jugadores
                  </span>
                </div>
                <button onClick={() => joinRoom(room.id)} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '4px 16px' }}>
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