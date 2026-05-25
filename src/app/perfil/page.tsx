'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { TITLES, LEVEL_COLORS, xpForLevel, calculateLevel } from '@/lib/xp'
import { formatMoney } from '@/lib/gameData'

export default function Perfil() {
  const router = useRouter()
  const [user, setUser]   = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'stats'|'logros'|'amigos'>('stats')

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!mounted) return
    init()
  }, [mounted])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setUser(user)
    const [{ data: prof }, { data: st }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('player_stats').select('*').eq('user_id', user.id).single(),
    ])
    setProfile(prof)
    setStats(st)
    setNewName(prof?.username || '')
    setLoading(false)
  }

  async function saveName() {
    if (!newName.trim() || !user) return
    await supabase.from('profiles').update({ username: newName.trim() }).eq('id', user.id)
    setProfile((p: any) => ({ ...p, username: newName.trim() }))
    setEditingName(false)
  }

  async function searchFriends() {
    if (!search.trim()) return
    const { data } = await supabase.from('profiles').select('id, username').ilike('username', `%${search}%`).neq('id', user?.id).limit(8)
    setSearchResults(data || [])
  }

  if (!mounted || loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#030712' }}>
      <p style={{ color:'#6366f1' }}>Cargando perfil...</p>
    </div>
  )

  const xp    = stats?.xp || 0
  const level = stats?.level || 1
  const title = TITLES[Math.min(level, 10)] || 'Becario'
  const lvColor = LEVEL_COLORS[Math.min(level, 10)] || '#71717a'
  const xpNeeded = xpForLevel(level)
  const { xp_to_next } = calculateLevel(xp)
  const xpProgress = xpNeeded > 0 ? Math.max(0, Math.min(100, ((xpNeeded - xp_to_next) / xpNeeded) * 100)) : 100

  const LOGROS = [
    { id: 'first_win',    icon: '🏆', name: 'Primera victoria',     desc: 'Gana tu primera partida',         done: (stats?.games_won||0) >= 1 },
    { id: 'five_wins',    icon: '👑', name: 'Pentacampeón',          desc: 'Gana 5 partidas',                 done: (stats?.games_won||0) >= 5 },
    { id: 'prop10',       icon: '🏢', name: 'Magnate emergente',     desc: 'Compra 10 propiedades en total',  done: (stats?.properties_bought||0) >= 10 },
    { id: 'prop50',       icon: '🌆', name: 'Imperio inmobiliario',  desc: 'Compra 50 propiedades en total',  done: (stats?.properties_bought||0) >= 50 },
    { id: 'rent100',      icon: '💰', name: 'Rentista',              desc: 'Cobra renta 100 veces',           done: (stats?.rents_collected||0) >= 100 },
    { id: 'game10',       icon: '🎲', name: 'Veterano',              desc: 'Juega 10 partidas',               done: (stats?.games_played||0) >= 10 },
    { id: 'cards20',      icon: '⚡', name: 'Estratega',             desc: 'Usa 20 cartas de Escándalo',      done: (stats?.cards_played||0) >= 20 },
    { id: 'level5',       icon: '⭐', name: 'Nivel 5',               desc: 'Alcanza el nivel 5',              done: level >= 5 },
    { id: 'level10',      icon: '💎', name: 'Amo del Cortijo',       desc: 'Alcanza el nivel 10',             done: level >= 10 },
  ]

  return (
    <main style={{ minHeight:'100vh', background:'#030712', color:'white', padding:'1.5rem 1rem' }}>
      <div style={{ maxWidth:760, margin:'0 auto' }}>

        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:'2rem' }}>
          <button onClick={() => router.back()} style={{ background:'#0f0f20', border:'1px solid #2a2a5a', color:'white', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:14 }}>← Volver</button>
          <h1 style={{ fontSize:'1.8rem', fontWeight:800, color:'#f59e0b', margin:0 }}>Mi Perfil</h1>
        </div>

        {/* Profile card */}
        <div style={{ background:'#080818', border:`2px solid ${lvColor}44`, borderRadius:18, padding:'1.5rem', marginBottom:'1.5rem', boxShadow:`0 0 30px ${lvColor}22` }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:20, flexWrap:'wrap' }}>
            <div style={{ width:70, height:70, borderRadius:'50%', background:`radial-gradient(circle at 35% 35%, ${lvColor}cc, ${lvColor}44)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, border:`3px solid ${lvColor}`, boxShadow:`0 0 20px ${lvColor}66`, flexShrink:0 }}>
              {level >= 10 ? '💎' : level >= 7 ? '🔥' : level >= 5 ? '⭐' : level >= 3 ? '🎯' : '🎲'}
            </div>
            <div style={{ flex:1 }}>
              {editingName ? (
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <input value={newName} onChange={e=>setNewName(e.target.value)} style={{ background:'#0f0f20', border:`1px solid ${lvColor}`, color:'white', borderRadius:8, padding:'6px 10px', fontSize:16, fontWeight:700, flex:1 }} onKeyDown={e=>e.key==='Enter'&&saveName()} autoFocus />
                  <button onClick={saveName} style={{ background:`linear-gradient(135deg,${lvColor},${lvColor}aa)`, color:'black', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontWeight:700 }}>Guardar</button>
                  <button onClick={()=>setEditingName(false)} style={{ background:'#1a1a2a', color:'white', border:'1px solid #2a2a5a', borderRadius:8, padding:'6px 12px', cursor:'pointer' }}>✕</button>
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <h2 style={{ fontSize:'1.4rem', fontWeight:800, margin:0 }}>{profile?.username || 'Jugador'}</h2>
                  <button onClick={()=>setEditingName(true)} style={{ background:'#1a1a2a', border:'1px solid #2a2a5a', color:'#888', borderRadius:6, padding:'2px 8px', cursor:'pointer', fontSize:12 }}>✏️ Editar</button>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ background:`${lvColor}22`, border:`1px solid ${lvColor}66`, borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700, color:lvColor }}>
                  Nivel {level}
                </div>
                <div style={{ fontSize:14, color:lvColor, fontWeight:600 }}>{title}</div>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#4a4a8a', marginBottom:4 }}>
                  <span>XP: {xp}</span>
                  <span>{level < 10 ? `Siguiente nivel: ${xp_to_next} XP` : 'Nivel máximo'}</span>
                </div>
                <div style={{ height:8, background:'#0f0f20', borderRadius:4, overflow:'hidden', border:`1px solid ${lvColor}22` }}>
                  <div style={{ height:'100%', width:`${xpProgress}%`, background:`linear-gradient(90deg,${lvColor}88,${lvColor})`, borderRadius:4, transition:'width 0.6s', boxShadow:`0 0 8px ${lvColor}` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', background:'#080818', borderRadius:10, padding:4, border:'1px solid #1a1a3a' }}>
          {(['stats','logros','amigos'] as const).map(tab => (
            <button key={tab} onClick={()=>setActiveTab(tab)} style={{ flex:1, padding:'8px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:600, fontSize:13, background:activeTab===tab?'linear-gradient(135deg,#6366f1,#4f46e5)':'transparent', color:activeTab===tab?'white':'#4a4a8a', transition:'all 0.2s' }}>
              {tab==='stats'?'📊 Estadísticas':tab==='logros'?'🏆 Logros':'👥 Amigos'}
            </button>
          ))}
        </div>

        {/* Stats tab */}
        {activeTab === 'stats' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              ['🎮', 'Partidas jugadas', stats?.games_played || 0, ''],
              ['🏆', 'Victorias',         stats?.games_won || 0,    `${stats?.games_played ? Math.round((stats.games_won/stats.games_played)*100) : 0}% winrate`],
              ['🏢', 'Propiedades compradas', stats?.properties_bought || 0, ''],
              ['💰', 'Rentas cobradas',   stats?.rents_collected || 0, ''],
              ['⚡', 'Cartas usadas',      stats?.cards_played || 0,  ''],
              ['⭐', 'XP total',           xp, ''],
            ].map(([icon,label,val,sub]) => (
              <div key={label as string} style={{ background:'#080818', borderRadius:12, padding:'14px 16px', border:'1px solid #1a1a3a' }}>
                <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
                <div style={{ fontSize:11, color:'#4a4a8a', marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:'#e0e0ff' }}>{typeof val==='number'?val.toLocaleString():val}</div>
                {sub && <div style={{ fontSize:10, color:'#6366f1', marginTop:2 }}>{sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Logros tab */}
        {activeTab === 'logros' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {LOGROS.map(l => (
              <div key={l.id} style={{ background: l.done ? '#0a0a18' : '#050510', borderRadius:12, padding:'14px 16px', border:`1px solid ${l.done?'#6366f166':'#1a1a3a'}`, opacity: l.done ? 1 : 0.5, transition:'all 0.3s' }}>
                <div style={{ fontSize:26, marginBottom:6, filter: l.done ? 'none' : 'grayscale(100%)' }}>{l.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color: l.done ? '#e0e0ff' : '#4a4a8a', marginBottom:3 }}>{l.name}</div>
                <div style={{ fontSize:11, color:'#4a4a8a', lineHeight:1.5 }}>{l.desc}</div>
                {l.done && <div style={{ fontSize:10, color:'#6366f1', marginTop:5, fontWeight:600 }}>✅ Desbloqueado</div>}
              </div>
            ))}
          </div>
        )}

        {/* Amigos tab */}
        {activeTab === 'amigos' && (
          <div>
            <div style={{ background:'#080818', borderRadius:12, padding:'1rem', marginBottom:12, border:'1px solid #1a1a3a' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#6366f1', marginBottom:10 }}>Buscar jugadores</div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre de usuario..." onKeyDown={e=>e.key==='Enter'&&searchFriends()} style={{ flex:1, background:'#0f0f20', border:'1px solid #2a2a5a', color:'white', borderRadius:8, padding:'8px 10px', fontSize:13 }} />
                <button onClick={searchFriends} style={{ background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'white', border:'none', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontWeight:600 }}>Buscar</button>
              </div>
              {searchResults.map(r => (
                <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:'#0a0a18', borderRadius:8, marginBottom:6, border:'1px solid #1a1a3a' }}>
                  <span style={{ fontSize:13 }}>{r.username}</span>
                  <button style={{ background:'#0f1a0f', color:'#4ade80', border:'1px solid #22c55e44', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>+ Añadir</button>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:'#4a4a8a', textAlign:'center', padding:'2rem' }}>Sistema de amigos próximamente 🔜</div>
          </div>
        )}

        <div style={{ textAlign:'center', padding:'2rem 0', color:'#1a1a3a', fontSize:11 }}>Iberiópolis · v1.0</div>
      </div>
    </main>
  )
}