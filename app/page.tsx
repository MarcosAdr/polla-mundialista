import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Trophy, Coins, Star, Users, ChevronUp, ChevronDown, Equal } from 'lucide-react'
import ResetPasswordButton from '@/components/ResetPasswordButton'
import GroupStandings from '@/components/GroupStandings'
import { calculateGroups } from '@/lib/standings'

// Force dynamic to avoid caching issues with real-time leaderboard
export const dynamic = 'force-dynamic'

// COMPONENTE VISUAL ACTUALIZADO CON CONTADOR DE PUESTOS
function TrendIndicator({ currentPos, previousPos }: { currentPos: number, previousPos?: number | null }) {
  // Si no hay registro previo o se mantuvo en el mismo puesto, mostramos el signo igual gris
  if (!previousPos || currentPos === previousPos) {
    return <Equal size={18} color="var(--text-muted)" style={{ opacity: 0.4 }} />
  }

  // Calculamos la diferencia absoluta de posiciones
  const diff = Math.abs(previousPos - currentPos)

  // Si la posición actual es MENOR (ej. estaba 5 y ahora está 3), significa que SUBIÓ
  if (currentPos < previousPos) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
          <ChevronUp size={18} strokeWidth={3} />
          <span>{diff}</span>
        </div>
    )
  }

  // Si la posición actual es MAYOR (ej. estaba 2 y ahora está 4), significa que BAJÓ
  return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
        <ChevronDown size={18} strokeWidth={3} />
        <span>{diff}</span>
      </div>
  )
}

export default async function Home() {
  const session = await getSession()

  const users = await prisma.user.findMany({
    where: { role: 'USER' },
    orderBy: { totalPoints: 'desc' },
    select: {
      id: true,
      username: true,
      totalPoints: true,
      contributedAmount: true,
      previousPosition: true,
      qualifierPoints: true,
    }
  })

  const matchesForStandings = await prisma.match.findMany({
    where: {
      isFinished: true,
      stage: { name: 'Fase de Grupos' }
    },
    include: {
      teamA: true,
      teamB: true,
      stage: true
    }
  });

  const groupsData = calculateGroups(matchesForStandings);

  const totalPool = users.reduce((sum, user) => sum + user.contributedAmount, 0)
  const totalParticipants = users.length

// Find current user stats
  let myPoints = 0
  let myQualifierPoints = 0 // 👇 Nueva variable
  let myPosition = 0

  if (session && session.user.role === 'USER') {
    const myIndex = users.findIndex(u => u.id === session.user.id)
    if (myIndex !== -1) {
      myPoints = users[myIndex].totalPoints
      // Aquí estamos tomando el nuevo campo que creamos en la BD
      myQualifierPoints = (users[myIndex] as any).qualifierPoints || 0
      myPosition = myIndex + 1
    }
  }

  return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Hero / Global Pool */}
        <section className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderTop: '4px solid var(--primary)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Pozo Acumulado</h1>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(0, 242, 254, 0.1)', padding: '12px 24px', borderRadius: '32px' }}>
            <Coins color="var(--primary)" size={32} />
            <span className="text-gradient" style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>
            ${totalPool.toFixed(2)}
          </span>
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '1.1rem' }}>
            ¡Predice los resultados y llévate el premio mayor!
          </p>
        </section>

        {/* Personal Stats */}
        {session && session.user.role === 'USER' && (
            <section>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

                {/* Mis Puntos */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Star size={26} color="#000" fill="#000" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis Puntos Totales</p>
                    <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)', marginBottom: '8px' }}>
                      {myPoints} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>pts</span>
                    </p>

                    {/* DESGLOSE DE PUNTOS */}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                      <span>Partidos: <strong>{myPoints - myQualifierPoints}</strong></span>
                      <span>|</span>
                      <span>32 Clasificados: <strong style={{ color: 'var(--primary)' }}>{myQualifierPoints}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Mi Posición */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--secondary), #ff6b6b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trophy size={26} color="#000" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mi Posición</p>
                    <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                      #{myPosition > 0 ? myPosition : '—'}{' '}
                      <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>
                    de {totalParticipants}
                  </span>
                    </p>
                  </div>
                </div>

                {/* Total Participantes */}
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #6c63ff, #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={26} color="#fff" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Participantes</p>
                    <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                      {totalParticipants}
                    </p>
                  </div>
                </div>

              </div>
            </section>
        )}


        {/* Leaderboard */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Trophy color="var(--secondary)" />
            <h2>Tabla de Posiciones</h2>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, width: '110px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>Usuario</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Puntos</th>
                  {session?.user.role === 'ADMIN' && (
                      <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Acciones (Admin)</th>
                  )}
                </tr>
                </thead>
                <tbody>
                {users.length === 0 ? (
                    <tr>
                      <td colSpan={session?.user.role === 'ADMIN' ? 4 : 3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No hay usuarios registrados todavía.
                      </td>
                    </tr>
                ) : (
                    users.map((user, index) => {
                      const isMe = session?.user.id === user.id
                      const currentPos = index + 1

                      return (
                          <tr key={user.id} style={{ borderTop: '1px solid var(--glass-border)', background: isMe ? 'rgba(0, 242, 254, 0.04)' : undefined }}>
                            <td style={{ padding: '16px', fontWeight: 800 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>

                                {/* RENDERIZAMOS LA TENDENCIA CON EL NÚMERO DE PUESTOS */}
                                <TrendIndicator currentPos={currentPos} previousPos={user.previousPosition} />

                                <span style={{ color: index < 3 ? 'var(--primary)' : 'var(--text-muted)', fontSize: index < 3 ? '1.2rem' : '1rem', minWidth: '20px', textAlign: 'center' }}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : currentPos}
                              </span>
                              </div>
                            </td>
                            <td style={{ padding: '16px', fontWeight: 500 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isMe ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'linear-gradient(135deg, var(--surface-hover), var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: isMe ? '#000' : undefined }}>
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <span>{user.username}</span>
                                {isMe && <span style={{ fontSize: '0.75rem', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700 }}>Tú</span>}
                              </div>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text)' }}>
                              {user.totalPoints} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>pts</span>
                            </td>

                            {session?.user.role === 'ADMIN' && (
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                  <ResetPasswordButton userId={user.id} username={user.username} />
                                </td>
                            )}
                          </tr>
                      )
                    })
                )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Trophy color="var(--primary)" />
            <h2>Fase de Grupos</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
            {Object.keys(groupsData).length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Aún no hay datos de grupos.</p>
            ) : (
                Object.entries(groupsData).map(([groupName, standings]) => (
                    <GroupStandings key={groupName} groupName={groupName} standings={standings} />
                ))
            )}
          </div>
        </section>
      </div>
  )
}