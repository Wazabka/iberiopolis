'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function JugarSinCuenta() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  async function entrarComoInvitado() {
    if (!nombre.trim()) { setError('Escribe tu nombre'); return }
    setLoading(true)
    setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInAnonymously()
      if (signInError) throw signInError
      const username = nombre.trim()
      await supabase.from('profiles').upsert({ id: data.user!.id, username }, { onConflict: 'id' })
      if (code.trim()) {
        const { data: room } = await supabase.from('game_rooms').select('*').eq('code', code.toUpperCase()).eq('status', 'waiting').single()
        if (!room) { setError('Sala no encontrada o ya iniciada'); setLoading(false); return }
        const { data: players } = await supabase.from('game_players').select('id').eq('room_id', room.id)
        if ((players?.length || 0) >= 5) { setError('La sala está llena'); setLoading(false); return }
        const colors = ['#E24B4A', '#378ADD', '#639922', '#BA7517', '#7F77DD']
        await supabase.from('game_players').insert({
          room_id: room.id, user_id: data.user!.id,
          color: colors[players?.length || 0], turn_order: players?.length || 0, money: 150000,
        })
        window.location.href = `/game/${room.id}`
      } else {
        window.location.href = '/lobby'
      }
    } catch (err: any) {
      setError(err.message || 'Error al entrar')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b', marginBottom: '4px' }}>Iberiópolis</h1>
          <p style={{ color: '#71717a', fontSize: '14px' }}>Jugar como invitado</p>
        </div>

        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '13px', color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>Tu nombre en el juego</label>
            <input className="input" type="text" placeholder="¿Cómo te llamas?" value={nombre} onChange={e => setNombre(e.target.value)} maxLength={20} onKeyDown={e => e.key === 'Enter' && entrarComoInvitado()} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '13px', color: '#a1a1aa', display: 'block', marginBottom: '6px' }}>Código de sala <span style={{ color: '#52525b' }}>(opcional)</span></label>
            <input className="input" type="text" placeholder="ABC123" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }} />
            <p style={{ fontSize: '11px', color: '#52525b', marginTop: '4px' }}>Déjalo vacío para ir al lobby y crear o unirte a una sala desde ahí.</p>
          </div>

          {error && <p style={{ color: '#fca5a5', fontSize: '13px', marginBottom: '12px', background: '#450a0a', padding: '8px 10px', borderRadius: '6px' }}>{error}</p>}

          <button onClick={entrarComoInvitado} disabled={loading} style={{ width: '100%', background: '#f59e0b', color: 'black', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 600, cursor: 'pointer', fontSize: '15px' }}>
            {loading ? 'Entrando...' : 'Entrar a jugar →'}
          </button>
        </div>

        <div style={{ background: '#18181b', border: '1px solid #3a3a60', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#f59e0b', marginBottom: '10px' }}>✨ ¿Por qué crear una cuenta?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {[
              { icon: '📊', text: 'Historial de partidas guardado' },
              { icon: '🏆', text: 'Sistema de niveles y títulos exclusivos' },
              { icon: '🎨', text: 'Fichas con marco y brillo según tu nivel' },
              { icon: '📈', text: 'Estadísticas detalladas (winrate, rentas cobradas...)' },
            ].map(t => (
              <div key={t.text} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#a1a1aa' }}>
                <span>{t.icon}</span><span>{t.text}</span>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/')} style={{ width: '100%', background: '#27272a', color: 'white', border: '1px solid #3f3f46', borderRadius: '8px', padding: '9px', cursor: 'pointer', fontSize: '13px', marginTop: '14px', fontWeight: 500 }}>
            Crear cuenta o iniciar sesión
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#52525b' }}>
          <span onClick={() => router.push('/reglas')} style={{ cursor: 'pointer', textDecoration: 'underline', color: '#71717a' }}>Ver las reglas del juego</span>
        </p>
      </div>
    </main>
  )
}
