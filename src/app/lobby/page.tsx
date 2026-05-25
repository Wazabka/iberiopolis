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
      const colors = ['#E24B4A', '#378ADD', '#2ECC71', '#F39C12', '#9B59B6']
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
        const colors = ['#E24B4A', '#378ADD', '#2ECC71', '#F39C12', '#9B59B6']
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#030712' }}>
      <p style={{ color: '#71717a' }}>Cargando...</p>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', padding: '1rem', maxWidth: '960px', margin: '0 auto', background: '#030712', color: 'white' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', marginTop: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', margin: 0, textShadow: '0 0 20px rgba(245,158,11,0.4)' }}>
            🎲 Iberiópolis
          </h1>
          <p style={{ color: '#4a4a8a', fontSize: '0.875rem', margin: '4px 0 0' }}>
            Hola, <span style={{ color: '#a0a0ff', fontWeight: 600 }}>{profile?.username || user?.email}</span>
          </p>
        </div>

        {/* Nav buttons — cada uno independiente, sin anidar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/reglas')}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', padding: '4px' }}
          >
            Reglas
          </button>
          <button
            onClick={() => router.push('/perfil')}
            style={{ background: 'none', border: '1px solid #4f46e5', color: '#818cf8', cursor: 'pointer', fontSize: '13px', borderRadius: '6px', padding: '5px 12px', fontWeight: 600 }}
          >
            👤 Mi perfil
          </button>
          <button
            onClick={handleSignOut}
            style={{ background: '#1a1a2a', border: '1px solid #2a2a5a', color: '#a0a0c0', cursor: 'pointer', fontSize: '13px', borderRadius: '8px', padding: '6px 14px' }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#fca5a5', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Create / Join */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: '#080818', border: '1px solid #1a1a3a', borderRadius: '14px', padding: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: '#e0e0ff' }}>🆕 Crear partida</h2>
          <p style={{ color: '#4a4a8a', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Crea una sala privada y comparte el código con tus amigos.
          </p>
          <button
            onClick={createRoom}
            disabled={creating}
            style={{ width: '100%', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'black', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 800, cursor: creating ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: creating ? 0.6 : 1 }}
          >
            {creating ? 'Creando...' : 'Nueva partida'}
          </button>
        </div>

        <div style={{ background: '#080818', border: '1px solid #1a1a3a', borderRadius: '14px', padding: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: '#e0e0ff' }}>🔑 Unirse con código</h2>
          <p style={{ color: '#4a4a8a', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Introduce el código de 6 letras que te ha pasado el host.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ flex: 1, background: '#0f0f20', border: '1px solid #2a2a5a', color: 'white', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', letterSpacing: '0.15em', textTransform: 'uppercase' }}
            />
            <button
              onClick={joinByCode}
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}
            >
              Entrar
            </button>
          </div>
        </div>
      </div>

      {/* Open rooms */}
      <div style={{ background: '#080818', border: '1px solid #1a1a3a', borderRadius: '14px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: '#e0e0ff' }}>🎮 Salas abiertas</h2>
          <button
            onClick={loadRooms}
            style={{ background: 'none', border: 'none', color: '#4a4a8a', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Actualizar
          </button>
        </div>
        {rooms.length === 0 ? (
          <p style={{ color: '#333366', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
            No hay salas abiertas. ¡Crea una!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rooms.map(room => (
              <div key={room.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f0f20', borderRadius: '10px', padding: '10px 16px', border: '1px solid #1a1a3a' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#f59e0b', fontSize: '1rem' }}>{room.code}</span>
                  <span style={{ color: '#4a4a8a', fontSize: '0.875rem', marginLeft: '12px' }}>
                    {room.game_players?.[0]?.count || 0}/5 jugadores
                  </span>
                </div>
                <button
                  onClick={() => joinRoom(room.id)}
                  style={{ background: '#0f1a0f', color: '#4ade80', border: '1px solid #22c55e44', borderRadius: '8px', padding: '5px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Unirse
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', color: '#1a1a3a', fontSize: '11px', marginTop: '2rem' }}>
        Iberiópolis · Uso privado · v1.0
      </p>
    </main>
  )
}