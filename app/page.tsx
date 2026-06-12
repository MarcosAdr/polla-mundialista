import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { Trophy, Coins, Star, Users } from 'lucide-react'
import ResetPasswordButton from '@/components/ResetPasswordButton'

// Force dynamic to avoid caching issues with real-time leaderboard
export const dynamic = 'force-dynamic'

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
    }
  })

  const totalPool = users.reduce((sum, user) => sum + user.contributedAmount, 0)
  const totalParticipants = users.length

  // Find current user stats
  let myPoints = 0
  let myPosition = 0
  if (session && session.user.role === 'USER') {
    const myIndex = users.findIndex(u => u.id === session.user.id)
    if (myIndex !== -1) {
      myPoints = users[myIndex].totalPoints
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

      {/* Personal Stats — only shown when a regular user is logged in */}
      {session && session.user.role === 'USER' && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>

            {/* Mis Puntos */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={26} color="#000" fill="#000" />
              </div>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis Puntos</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, color: 'var(--text)' }}>
                  {myPoints} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}>pts</span>
                </p>
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
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, width: '60px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600 }}>Usuario</th>
                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Puntos</th>
                {/* Nueva cabecera: Solo se muestra si el rol es ADMIN */}
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
                    return (
                        <tr key={user.id} style={{ borderTop: '1px solid var(--glass-border)', background: isMe ? 'rgba(0, 242, 254, 0.04)' : undefined }}>
                          <td style={{ padding: '16px', textAlign: 'center', fontWeight: 800, color: index < 3 ? 'var(--primary)' : 'var(--text-muted)' }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
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

                          {/* Nueva celda: Renderizamos el botón importado solo para el ADMIN */}
                          {session?.user.role === 'ADMIN' && (
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                {/* IMPORTANTE: Recuerda importar este componente al inicio del archivo: 
                                import ResetPasswordButton from '@/components/ResetPasswordButton' */}
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

    </div>
  )
}
