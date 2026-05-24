'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROLES_DEF } from '@/lib/gameData'
import { Role } from '@/types/game'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f59e0b', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #27272a' }}>{title}</h2>
      <div style={{ fontSize: '14px', lineHeight: 1.8, color: '#a1a1aa', display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
    </div>
  )
}

function Rule({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '12px', background: '#18181b', borderRadius: '10px', padding: '12px 14px', border: '1px solid #27272a' }}>
      <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: '#e8e8f5', marginBottom: '3px' }}>{title}</div>
        <div style={{ fontSize: '13px', color: '#71717a', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  )
}

export default function Reglas() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const roles = Object.entries(ROLES_DEF) as [Role, typeof ROLES_DEF.saboteador][]

  return (
    <main style={{ minHeight: '100vh', background: '#09090b', color: 'white', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2.5rem' }}>
          <button onClick={() => router.back()} style={{ background: '#27272a', border: '1px solid #3f3f46', color: 'white', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}>← Volver</button>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', margin: 0 }}>Reglas de Iberiópolis</h1>
            <p style={{ color: '#71717a', fontSize: '13px', margin: '4px 0 0' }}>El Monopoly español online · v1.0</p>
          </div>
        </div>

        <Section title="¿Qué es Iberiópolis?">
          <p>Iberiópolis es un juego de mesa online inspirado en el Monopoly clásico, ambientado en el mundo empresarial español. El objetivo es acumular <strong style={{ color: '#f59e0b' }}>€1.000.000 de patrimonio neto</strong> antes que el resto de jugadores, combinando compra de empresas, cobro de rentas y el uso estratégico de tu rol único.</p>
          <p>A diferencia del Monopoly clásico, aquí hay <strong style={{ color: '#e8e8f5' }}>roles asimétricos</strong>, <strong style={{ color: '#e8e8f5' }}>alianzas con coste de traición</strong>, <strong style={{ color: '#e8e8f5' }}>votaciones grupales</strong> y <strong style={{ color: '#e8e8f5' }}>cartas de Escándalo Nacional</strong> que pueden cambiar el rumbo de la partida en cualquier momento.</p>
        </Section>

        <Section title="Preparación">
          <Rule icon="👥" title="Jugadores" desc="De 2 a 5 jugadores. El host crea la sala y comparte el código de 6 letras con los demás." />
          <Rule icon="🎭" title="Elección de rol" desc="Cada jugador elige un rol único en la sala de espera. No pueden repetirse dos roles iguales en la misma partida." />
          <Rule icon="💶" title="Dinero inicial" desc="Cada jugador comienza con €150.000 en efectivo. El banco tiene fondos ilimitados." />
          <Rule icon="🎲" title="Orden de turno" desc="Se decide aleatoriamente al pulsar 'Iniciar partida'. El host no tiene ninguna ventaja de orden." />
        </Section>

        <Section title="Estructura de un turno">
          <Rule icon="1️⃣" title="Tirar los dados" desc="Lanzas dos dados y mueves tu ficha el número de casillas resultante en el sentido de las agujas del reloj." />
          <Rule icon="2️⃣" title="Aplicar la casilla" desc="Según donde caigas: compras una propiedad libre, pagas renta al dueño, o aplicas el efecto de la casilla especial." />
          <Rule icon="3️⃣" title="Construir mejoras (opcional)" desc="Si es tu turno y tienes al menos 2 propiedades del mismo grupo de color, puedes construir una mejora en cualquiera de ellas." />
          <Rule icon="4️⃣" title="Usar habilidad activa (opcional)" desc="Puedes usar la habilidad activa de tu rol una vez por turno. La habilidad única solo puede usarse una vez por partida." />
          <Rule icon="5️⃣" title="Negociar (en cualquier momento)" desc="Puedes proponer tratos, alianzas o intercambios con otros jugadores en cualquier momento de tu turno o del de los demás." />
        </Section>

        <Section title="El tablero">
          <p>El tablero tiene <strong style={{ color: '#e8e8f5' }}>38 casillas</strong> distribuidas en cuatro lados. Las propiedades se agrupan en 4 franjas según su tipo y precio:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { color: '#185FA5', bg: '#d6e8f7', label: 'Startup', desc: 'Glovo, Cabify, Idealista, Wallapop. Las más baratas, ideales para el inicio de partida.' },
              { color: '#3B6D11', bg: '#cce8d2', label: 'Servicios', desc: 'El Corte Inglés, BBVA, Santander, Mapfre. Precio medio con renta estable y predecible.' },
              { color: '#854F0B', bg: '#fce8cc', label: 'Corporación', desc: 'Iberia, Repsol, Endesa, ACS. Caras pero con rentas muy elevadas en niveles altos.' },
              { color: '#A32D2D', bg: '#fad6d6', label: 'Monopolio', desc: 'Inditex, Mercadona, Telefónica, Santander+BBVA. Las más poderosas del tablero.' },
            ].map(g => (
              <div key={g.label} style={{ background: g.bg, borderRadius: '8px', padding: '10px 12px', borderLeft: `4px solid ${g.color}` }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: g.color, marginBottom: '4px' }}>{g.label}</div>
                <div style={{ fontSize: '12px', color: '#3d3d60', lineHeight: 1.5 }}>{g.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Propiedades y mejoras">
          <Rule icon="🏢" title="Comprar una propiedad" desc="Si caes en una casilla libre, puedes comprarla al precio indicado o dejarla pasar. Si la dejas pasar, sale a subasta entre todos." />
          <Rule icon="📊" title="Subasta con plica simultánea" desc="Todos escriben su oferta en secreto y se revelan a la vez. El más alto gana y paga. El segundo más alto paga el 10% de su oferta como penalización." />
          <Rule icon="🏗️" title="Niveles de mejora" desc="Cada propiedad tiene 3 niveles: Oficina → Sede Regional → Holding Nacional. Necesitas al menos 2 propiedades del mismo grupo para construir el primer nivel." />
          <Rule icon="📉" title="Degradar mejoras" desc="Puedes bajar un nivel voluntariamente para recuperar el 60% del coste de esa mejora y obtener liquidez. No puedes construir y degradar en el mismo turno." />
          <Rule icon="💰" title="Grupo completo" desc="Si posees las 4 propiedades de un mismo grupo, la renta base de todas ellas sube un 25%, incluso sin ninguna mejora construida." />
        </Section>

        <Section title="Casillas especiales">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { icon: '🚀', name: 'Salida', desc: 'Cobras €20.000 cada vez que la cruzas o caes en ella.' },
              { icon: '💸', name: 'Hacienda Somos Todos', desc: 'Pagas el 15% de tu efectivo al banco. El Asesor Fiscal solo paga el 9,8%.' },
              { icon: '😴', name: 'Siesta Nacional', desc: 'Pierdes un turno pero cobras €5.000 del banco como compensación.' },
              { icon: '🏖️', name: 'Vacaciones en Ibiza', desc: 'Pierdes un turno pero cobras €10.000 del banco.' },
              { icon: '💶', name: 'Subvención UE / PYME', desc: 'Cobras entre €35.000 y €40.000 del banco sin ninguna condición.' },
              { icon: '🔍', name: 'Inspección Laboral', desc: 'El jugador con más propiedades paga €15.000 al banco.' },
              { icon: '!', name: 'Escándalo Nacional', desc: 'Roba una carta del mazo rojo y aplica su efecto inmediatamente (o guárdala).' },
              { icon: '✈️', name: 'ERE Express', desc: 'Teletrásporte gratis: elige a qué Startup o Servicio moverte directamente.' },
              { icon: '📈', name: 'IPO en Bolsa', desc: 'Elige una propiedad tuya: sube un 40% su valor de venta de forma permanente.' },
              { icon: '⚖️', name: 'Juzgado de lo Social', desc: 'Quedas retenido. Para salir: paga €50.000, saca dobles en el dado, o usa una carta Indulto.' },
              { icon: '☕', name: 'Siesta Libre', desc: 'No pasa absolutamente nada. Solo mirando.' },
            ].map(c => (
              <div key={c.name} style={{ background: '#18181b', borderRadius: '8px', padding: '10px 12px', border: '1px solid #27272a', display: 'flex', gap: '10px' }}>
                <div style={{ fontSize: '16px', flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#e8e8f5', marginBottom: '2px' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: '#71717a', lineHeight: 1.5 }}>{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Cartas de Escándalo Nacional">
          <p>Hay 24 cartas divididas en 4 tipos. Las marcadas con <strong style={{ color: '#f59e0b' }}>✦</strong> se pueden guardar en mano (máximo 2 cartas guardadas a la vez).</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { color: '#fca5a5', bg: '#450a0a', label: 'Ofensivas (6)', desc: 'Van contra un rival concreto. Filtraciones, Inspección de Hacienda, Expediente de regulación, OPA Hostil ✦, Demanda colectiva y Cártel empresarial.' },
              { color: '#d4d4d8', bg: '#27272a', label: 'Neutras (6)', desc: 'Afectan a todos por igual. Crisis de suministro, Subida del IPC, Elecciones generales, Fusión bancaria, Apagón digital y Huelga de transportes.' },
              { color: '#86efac', bg: '#14532d', label: 'Beneficiosas (6)', desc: 'Te favorecen a ti. Obra pública, Bono social, Indulto político ✦, Subvención europea, Boom turístico ✦ e IPO en Bolsa.' },
              { color: '#d8b4fe', bg: '#2e1065', label: 'Caos total (6)', desc: 'Cambian el tablero radicalmente. Apagón regulatorio, Gran redistribución, Rotación de activos, Crack del 29, Intervención del Estado y Corralito.' },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, borderRadius: '8px', padding: '10px 12px', border: `1px solid ${c.color}33` }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: c.color, marginBottom: '4px' }}>{c.label}</div>
                <div style={{ fontSize: '12px', color: c.color, opacity: 0.85, lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Alianzas y votaciones">
          <Rule icon="🤝" title="Alianzas" desc="Cualquier jugador puede proponer una alianza en cualquier momento. Durante la alianza: sin cobro de renta mutua, información compartida y pujas conjuntas en subastas. Romperla antes de tiempo cuesta €30.000 al banco." />
          <Rule icon="⚔️" title="Traición" desc="El Saboteador es el único rol inmune a la penalización por romper alianzas. El resto debe pagar los €30.000 sin excepción." />
          <Rule icon="🗳️" title="Votaciones grupales" desc="El Sindicalista o ciertas cartas pueden convocar votaciones sobre reglas activas del juego. Mayoría simple gana. En caso de empate no se aplica la medida. El Sindicalista tiene doble voto." />
          <Rule icon="💱" title="Tratos entre jugadores" desc="Puedes proponer intercambios de propiedades, dinero o acuerdos de no agresión libremente. El Negociador hace sus tratos vinculantes automáticamente." />
        </Section>

        <Section title="Roles — elige el tuyo antes de jugar">
          <p>Haz clic en un rol para ver sus detalles completos. Cada rol tiene una <strong style={{ color: '#e8e8f5' }}>pasiva permanente</strong> que está siempre activa, una <strong style={{ color: '#e8e8f5' }}>habilidad activa</strong> usable una vez por turno, y una <strong style={{ color: '#e8e8f5' }}>habilidad única</strong> usable solo una vez por partida.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            {roles.map(([key, def]) => (
              <button key={key} onClick={() => setActiveRole(activeRole === key ? null : key)} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: '10px', border: activeRole === key ? `2px solid ${def.textColor}` : '1px solid #27272a', background: activeRole === key ? def.color : '#18181b', cursor: 'pointer', transition: 'all 0.15s' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: activeRole === key ? def.textColor : '#e8e8f5', marginBottom: '3px' }}>{def.name}</div>
                <div style={{ fontSize: '11px', color: activeRole === key ? def.textColor : '#71717a', opacity: activeRole === key ? 0.8 : 1 }}>Pulsa para ver detalles</div>
              </button>
            ))}
          </div>
          {activeRole && (() => {
            const def = ROLES_DEF[activeRole]
            return (
              <div style={{ background: def.color, borderRadius: '12px', padding: '16px 18px', border: `1px solid ${def.textColor}44` }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: def.textColor, marginBottom: '12px' }}>{def.name}</div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: def.textColor, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Pasiva permanente</div>
                  <div style={{ fontSize: '13px', color: def.textColor }}>{def.passive}</div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: def.textColor, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Activa (1 vez/turno)</div>
                  <div style={{ fontSize: '13px', color: def.textColor }}>{def.active}</div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: def.textColor, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Única (1 vez/partida)</div>
                  <div style={{ fontSize: '13px', color: def.textColor }}>{def.unique}</div>
                </div>
              </div>
            )
          })()}
        </Section>

        <Section title="Sistema de niveles (cuentas registradas)">
          <p>Al crear una cuenta o registrarte con Google, ganas <strong style={{ color: '#f59e0b' }}>XP</strong> con cada acción en el juego. Subir de nivel desbloquea títulos exclusivos y cosméticos para tu ficha.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              ['Jugar una partida', '+10 XP'],
              ['Ganar una partida', '+50 XP'],
              ['Comprar una propiedad', '+3 XP'],
              ['Cobrar una renta', '+2 XP'],
              ['Usar una carta', '+2 XP'],
              ['Formar una alianza', '+5 XP'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', background: '#18181b', borderRadius: '8px', padding: '8px 12px', border: '1px solid #27272a' }}>
                <span style={{ fontSize: '12px', color: '#71717a' }}>{k}</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f59e0b' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '13px', color: '#e8e8f5', marginBottom: '8px' }}>Títulos por nivel:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                [1, 'Becario', '#71717a'], [2, 'Empleado del Mes', '#71717a'],
                [3, 'Mando Intermedio', '#3B6D11'], [4, 'Jefe de Área', '#3B6D11'],
                [5, 'Director Regional', '#185FA5'], [6, 'CEO en Prácticas', '#185FA5'],
                [7, 'Tiburón del IBEX', '#854F0B'], [8, 'Magnate Nacional', '#854F0B'],
                [9, 'Oligarca Ibérico', '#A32D2D'], [10, 'El Amo del Cortijo', '#f59e0b'],
              ].map(([lvl, title, color]) => (
                <div key={lvl as number} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#18181b', borderRadius: '8px', padding: '7px 10px', border: '1px solid #27272a' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: color as string, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0 }}>{lvl as number}</div>
                  <span style={{ fontSize: '12px', color: color as string, fontWeight: 500 }}>{title as string}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Condición de victoria">
          <Rule icon="🏆" title="Victoria estándar" desc="Gana el primero en alcanzar €1.000.000 de patrimonio neto (efectivo + valor de propiedades + coste de mejoras). Se evalúa al final de cada ronda completa." />
          <Rule icon="⏱️" title="Modo corto (opcional)" desc="El host puede fijar un límite de rondas. Al acabar, gana quien tenga mayor patrimonio neto. Elimina las partidas interminables." />
          <Rule icon="📊" title="Cálculo del patrimonio" desc="Efectivo en mano + precio de compra de cada propiedad + coste acumulado de sus mejoras + 40% extra si tiene IPO activo." />
        </Section>

        <Section title="Referencia rápida de economía">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              ['Dinero inicial', '€150.000'],
              ['Cobro al pasar Salida', '€20.000'],
              ['Salir del Juzgado', '€50.000 o dobles'],
              ['Romper alianza', '€30.000 al banco'],
              ['Hacienda', '−15% de tu efectivo'],
              ['Inspección Laboral', '€15.000 el de más props.'],
              ['Penalización 2ª subasta', '10% de tu oferta'],
              ['Objetivo de victoria', '€1.000.000 patrimonio neto'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', background: '#18181b', borderRadius: '8px', padding: '8px 12px', border: '1px solid #27272a' }}>
                <span style={{ fontSize: '12px', color: '#71717a' }}>{k}</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#f59e0b' }}>{v}</span>
              </div>
            ))}
          </div>
        </Section>

        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#52525b', fontSize: '12px' }}>
          Iberiópolis · Uso privado · v1.0
        </div>
      </div>
    </main>
  )
}
