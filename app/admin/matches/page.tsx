'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TEAMS } from '@/lib/teams'

type Team = { id: string, name: string, flagUrl?: string | null }
// 👇 Agregamos penaltyWinner al tipo Match
type Match = { id: string, teamA: Team, teamB: Team, teamAScore: number | null, teamBScore: number | null, isFinished: boolean, date?: string | null, penaltyWinner?: string | null }
type Stage = { id: string, name: string, isActive: boolean, matches: Match[] }

export default function AdminMatchesPage() {
  const [stages, setStages] = useState<Stage[]>([])
  const [loading, setLoading] = useState(true)

  const [teamAIndex, setTeamAIndex] = useState('0')
  const [teamBIndex, setTeamBIndex] = useState('1')
  const [selectedStage, setSelectedStage] = useState('')
  const [matchDate, setMatchDate] = useState('')

  const fetchStages = () => {
    fetch('/api/admin/matches')
        .then(res => res.json())
        .then(data => {
          const sortedStages = data.map((stage: Stage) => {
            const sortedMatches = [...stage.matches].sort((a, b) => {
              if (!a.date) return 1;
              if (!b.date) return -1;
              return new Date(a.date).getTime() - new Date(b.date).getTime();
            });
            return { ...stage, matches: sortedMatches };
          });

          setStages(sortedStages)
          if (sortedStages.length > 0 && !selectedStage) setSelectedStage(sortedStages[0].id)
          setLoading(false)
        })
  }

  useEffect(() => {
    fetchStages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault()

    const teamA = TEAMS[Number(teamAIndex)]
    const teamB = TEAMS[Number(teamBIndex)]

    if (teamA.name === teamB.name) {
      alert("No puedes enfrentar al mismo equipo contra sí mismo.")
      return
    }

    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamAName: teamA.name,
        teamAFlag: teamA.code,
        teamBName: teamB.name,
        teamBFlag: teamB.code,
        stageId: selectedStage,
        matchDate: matchDate ? new Date(matchDate).toISOString() : null
      })
    })

    if (res.ok) {
      setMatchDate('')
      fetchStages()
    } else {
      alert("Error al crear el partido")
    }
  }

  // 👇 Actualizamos la función para recibir y enviar penaltyWinner
  const handleUpdateResult = async (matchId: string, scoreA: number, scoreB: number, penaltyWinner?: string | null) => {
    if (confirm('¿Confirmar resultado? Esto calculará los puntos de los usuarios.')) {
      await fetch('/api/admin/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, teamAScore: scoreA, teamBScore: scoreB, penaltyWinner })
      })
      fetchStages()
    }
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este partido? Se eliminarán todos los pronósticos asociados.')) {
      await fetch(`/api/admin/matches?id=${matchId}`, {
        method: 'DELETE'
      })
      fetchStages()
    }
  }

  const handleUpdateDate = async (matchId: string, newDate: string) => {
    await fetch('/api/admin/matches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, matchDate: newDate ? new Date(newDate).toISOString() : null })
    })
    fetchStages()
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: '40px' }}>Cargando panel...</div>

  const groups = Array.from(new Set(TEAMS.map(t => t.group)))

  return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h1>Gestión de Partidos</h1>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link href="/admin/qualifiers" style={{ textDecoration: 'none' }}>
              <button
                  className="btn"
                  style={{
                    background: 'var(--danger)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                  }}
              >
                👑 Ingresar y Cerrar Clasificados
              </button>
            </Link>
            <Link href="/admin/settings" style={{ textDecoration: 'none' }}>
              <button className="btn btn-surface">
                ⚙️ Configurar Puntos
              </button>
            </Link>
          </div>

        </div>

        <div className="glass-card">
          <h2>Crear Nuevo Partido</h2>
          <form onSubmit={handleCreateMatch} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '16px' }}>

            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Fase</label>
              <select className="input" value={selectedStage} onChange={e => setSelectedStage(e.target.value)}>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Fecha y Hora</label>
              <input
                  type="datetime-local"
                  className="input"
                  value={matchDate}
                  onChange={e => setMatchDate(e.target.value)}
                  required
              />
            </div>

            <div style={{ flex: '1 1 250px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Equipo A</label>
              <select className="input" value={teamAIndex} onChange={e => setTeamAIndex(e.target.value)}>
                {groups.map(groupName => (
                    <optgroup key={`A-${groupName}`} label={groupName}>
                      {TEAMS.map((t, i) => t.group === groupName && (
                          <option key={`A-${i}`} value={i}>{t.name}</option>
                      ))}
                    </optgroup>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 250px' }}>
              <label style={{ display: 'block', marginBottom: '8px' }}>Equipo B</label>
              <select className="input" value={teamBIndex} onChange={e => setTeamBIndex(e.target.value)}>
                {groups.map(groupName => (
                    <optgroup key={`B-${groupName}`} label={groupName}>
                      {TEAMS.map((t, i) => t.group === groupName && (
                          <option key={`B-${i}`} value={i}>{t.name}</option>
                      ))}
                    </optgroup>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ flex: '1 1 100%' }}>Crear Partido</button>
          </form>
        </div>

        <div>
          {stages.map(stage => {
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const yesterdayStart = new Date(todayStart)
            yesterdayStart.setDate(yesterdayStart.getDate() - 1)

            const tomorrowStart = new Date(todayStart)
            tomorrowStart.setDate(tomorrowStart.getDate() + 1)

            const finishedMatches = stage.matches.filter(m => m.isFinished)
            const pendingMatches = stage.matches.filter(m => !m.isFinished)
            const visiblePending = pendingMatches.filter(m => m.date && new Date(m.date) >= yesterdayStart && new Date(m.date) < tomorrowStart)
            const hiddenPending = pendingMatches.filter(m => !m.date || new Date(m.date) < yesterdayStart || new Date(m.date) >= tomorrowStart)

            return (
                <div key={stage.id} style={{ marginBottom: '32px' }}>
                  <h2 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>{stage.name}</h2>

                  {stage.matches.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No hay partidos en esta fase.</p>
                  ) : (
                      <>
                        <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '16px' }}>A evaluar (Ayer y Hoy)</h3>
                        {visiblePending.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                              {visiblePending.map(match => (
                                  <MatchAdminCard key={match.id} match={match} stageName={stage.name} onUpdate={handleUpdateResult} onDelete={handleDeleteMatch} onUpdateDate={handleUpdateDate} />
                              ))}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.1)' }}>
                              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay partidos de ayer u hoy pendientes de resultado.</p>
                            </div>
                        )}

                        {hiddenPending.length > 0 && (
                            <details style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)' }}>
                              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-muted)', userSelect: 'none' }}>
                                Ver otros pendientes (Futuros o Atrasados) ({hiddenPending.length})
                              </summary>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
                                {hiddenPending.map(match => (
                                    <MatchAdminCard key={match.id} match={match} stageName={stage.name} onUpdate={handleUpdateResult} onDelete={handleDeleteMatch} onUpdateDate={handleUpdateDate} />
                                ))}
                              </div>
                            </details>
                        )}

                        {finishedMatches.length > 0 && (
                            <details style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)' }}>
                              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--success)', userSelect: 'none' }}>
                                Ver partidos cerrados (Ya evaluados) ({finishedMatches.length})
                              </summary>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '20px' }}>
                                {finishedMatches.map(match => (
                                    <MatchAdminCard key={match.id} match={match} stageName={stage.name} onUpdate={handleUpdateResult} onDelete={handleDeleteMatch} onUpdateDate={handleUpdateDate} />
                                ))}
                              </div>
                            </details>
                        )}
                      </>
                  )}
                </div>
            )
          })}
        </div>
      </div>
  )
}

function MatchAdminCard({ match, stageName, onUpdate, onDelete, onUpdateDate }: { match: Match, stageName: string, onUpdate: (id: string, a: number, b: number, penaltyWinner?: string | null) => void, onDelete: (id: string) => void, onUpdateDate: (id: string, d: string) => void }) {
  const [scoreA, setScoreA] = useState(match.teamAScore ?? 0)
  const [scoreB, setScoreB] = useState(match.teamBScore ?? 0)

  // Estado para manejar quién ganó en penales si hay empate
  const [penaltyWinner, setPenaltyWinner] = useState<'A' | 'B' | null>(match.penaltyWinner as 'A' | 'B' | null)

  const [isEditingDate, setIsEditingDate] = useState(false)
  const [editDate, setEditDate] = useState(match.date ? new Date(new Date(match.date).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '')

  // 👇 NUEVO ESTADO: Controla si estamos corrigiendo un partido ya cerrado
  const [isEditingResult, setIsEditingResult] = useState(false)

  const groupName = stageName === 'Fase de Grupos' ? (TEAMS.find(t => t.name === match.teamA.name)?.group || '') : ''
  const isKnockout = stageName !== 'Fase de Grupos'
  const isDraw = scoreA === scoreB

  const handleSaveDate = () => {
    onUpdateDate(match.id, editDate)
    setIsEditingDate(false)
  }

  const handleSaveResult = () => {
    if (isKnockout && isDraw && !penaltyWinner) {
      alert("En fases eliminatorias, si hay empate, debes seleccionar quién avanzá (Penales/Alargue).")
      return
    }
    const finalPenaltyWinner = (isKnockout && isDraw) ? penaltyWinner : null
    onUpdate(match.id, scoreA, scoreB, finalPenaltyWinner)
    setIsEditingResult(false) // Cerramos el modo edición al guardar
  }

  return (
      <div className="glass-card" style={{ padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>

        {groupName && <div style={{ position: 'absolute', top: 8, left: 12, fontSize: '0.75rem', fontWeight: 800, color: 'var(--secondary)' }}>{groupName.toUpperCase()}</div>}

        {!isEditingDate ? (
            match.date && <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(match.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
        ) : null}

        <div style={{ position: 'absolute', top: 6, right: 12, display: 'flex', gap: '8px' }}>
          <button onClick={() => setIsEditingDate(!isEditingDate)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', padding: '2px' }} title="Editar fecha">✏️</button>
          <button onClick={() => onDelete(match.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '2px' }} title="Eliminar partido">×</button>
        </div>

        {isEditingDate && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginTop: '16px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Modificar Fecha y Hora:</label>
              <input type="datetime-local" className="input" value={editDate} onChange={e => setEditDate(e.target.value)} />
              <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.85rem' }} onClick={handleSaveDate}>Guardar Fecha</button>
            </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: isEditingDate ? '8px' : '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            {match.teamA.flagUrl && <img src={`https://flagcdn.com/w40/${match.teamA.flagUrl}.png`} width="24" alt="flag" style={{ borderRadius: '4px' }} />}
            <span style={{ fontWeight: 'bold' }}>{match.teamA.name}</span>
          </div>
          <span style={{ color: 'var(--text-muted)', padding: '0 8px' }}>vs</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            <span style={{ fontWeight: 'bold' }}>{match.teamB.name}</span>
            {match.teamB.flagUrl && <img src={`https://flagcdn.com/w40/${match.teamB.flagUrl}.png`} width="24" alt="flag" style={{ borderRadius: '4px' }} />}
          </div>
        </div>

        {/* 👇 MODIFICADO: Si el partido terminó Y NO estamos editando, muestra la información estática con la opción de corregir */}
        {match.isFinished && !isEditingResult ? (
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <div>
                Resultado Final: <strong style={{ fontSize: '1.2rem' }}>{match.teamAScore} - {match.teamBScore}</strong>
              </div>
              {match.penaltyWinner && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    🌟 Clasifica: {match.penaltyWinner === 'A' ? match.teamA.name : match.teamB.name}
                  </div>
              )}

              {/* Botón para habilitar la edición de marcadores cerrados */}
              <button
                  className="btn btn-surface"
                  onClick={() => setIsEditingResult(true)}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', marginTop: '6px', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                ✏️ Corregir / Reevaluar Puntos
              </button>
            </div>
        ) : (
            // Formulario interactivo de carga/edición
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="number" className="input" style={{ width: '60px', textAlign: 'center' }} value={scoreA} onChange={e => setScoreA(Number(e.target.value))} min={0} />
                <span>-</span>
                <input type="number" className="input" style={{ width: '60px', textAlign: 'center' }} value={scoreB} onChange={e => setScoreB(Number(e.target.value))} min={0} />
              </div>

              {isKnockout && isDraw && (
                  <div style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: '#ef4444', margin: '0 0 8px 0', fontWeight: 'bold' }}>¡Empate! ¿Quién clasifica?</p>
                    <select className="input" value={penaltyWinner || ''} onChange={e => setPenaltyWinner(e.target.value as 'A' | 'B')} style={{ width: '100%' }}>
                      <option value="" disabled>Selecciona el ganador...</option>
                      <option value="A">{match.teamA.name}</option>
                      <option value="B">{match.teamB.name}</option>
                    </select>
                  </div>
              )}

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                {match.isFinished && (
                    <button className="btn btn-surface" onClick={() => setIsEditingResult(false)} style={{ flex: 1 }}>Cancelar</button>
                )}
                <button className="btn btn-primary" onClick={handleSaveResult} style={{ flex: 2 }}>
                  {match.isFinished ? 'Recalcular Todo' : 'Guardar Resultado'}
                </button>
              </div>
            </div>
        )}
      </div>
  )
}