'use client'

import { useState, useEffect } from 'react'
import { TEAMS } from '@/lib/teams'

type Team = { id: string, name: string, flagUrl?: string | null }
type Match = { id: string, teamA: Team, teamB: Team, isFinished: boolean, teamAScore: number | null, teamBScore: number | null, date?: string | null }
type Stage = { id: string, name: string, matches: Match[] }
type Prediction = { matchId: string, teamAScore: number, teamBScore: number, pointsEarned: number | null }

export default function PredictionsPage() {
    const [stages, setStages] = useState<Stage[]>([])
    const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
    const [loading, setLoading] = useState(true)
    // Estado para guardar el partido más próximo por cerrar
    const [urgentMatch, setUrgentMatch] = useState<Match | null>(null)

    useEffect(() => {
        fetch('/api/predictions')
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    // Ordenar partidos cronológicamente
                    const sortedStages = data.stages.map((stage: Stage) => {
                        const sortedMatches = [...stage.matches].sort((a, b) => {
                            if (!a.date) return 1;
                            if (!b.date) return -1;
                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                        });
                        return { ...stage, matches: sortedMatches };
                    });

                    setStages(sortedStages)

                    // LÓGICA: Encontrar el partido más cercano en el futuro
                    let closest: Match | null = null;
                    let minTime = Infinity;
                    const now = Date.now();

                    data.stages.forEach((stage: Stage) => {
                        stage.matches.forEach((match: Match) => {
                            if (!match.isFinished && match.date) {
                                const matchTime = new Date(match.date).getTime();
                                // Si el partido está en el futuro y es el más cercano que hemos visto
                                if (matchTime > now && matchTime < minTime) {
                                    minTime = matchTime;
                                    closest = match;
                                }
                            }
                        });
                    });
                    setUrgentMatch(closest)

                    const predMap: Record<string, Prediction> = {}
                    data.predictions.forEach((p: Prediction) => {
                        predMap[p.matchId] = p
                    })
                    setPredictions(predMap)
                }
                setLoading(false)
            })
    }, [])

    const handleSavePrediction = async (matchId: string, scoreA: number, scoreB: number) => {
        setPredictions(prev => ({ ...prev, [matchId]: { matchId, teamAScore: scoreA, teamBScore: scoreB, pointsEarned: null } }))

        await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, teamAScore: scoreA, teamBScore: scoreB })
        })
    }

    // Función auxiliar para calcular de forma amigable cuánto tiempo falta
    const getRemainingTimeText = (dateStr: string) => {
        const diffMs = new Date(dateStr).getTime() - Date.now();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 60) {
            return `en ${diffMins} minutos`;
        } else if (diffHours < 24) {
            const remainingMins = diffMins % 60;
            return `en ${diffHours}h y ${remainingMins}m`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `en ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        }
    }

    if (loading) return <div style={{ textAlign: 'center', marginTop: '40px' }}>Cargando pronósticos...</div>

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h1>Mis Pronósticos</h1>
                <p style={{ color: 'var(--text-muted)' }}>Ingresa tus predicciones para los partidos activos. ¡Se guardan automáticamente!</p>
            </div>

            {/* BANNER DE ALERTA GLOBAL (Solo si existe un partido próximo disponible) */}
            {urgentMatch && (
                <div className="glass-card" style={{
                    borderLeft: '4px solid #f59e0b', // Borde color ámbar de advertencia
                    background: 'rgba(245, 158, 11, 0.04)',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(245, 158, 11, 0.05)'
                }}>
                    <span style={{ fontSize: '1.8rem', animation: 'pulse 2s infinite' }}>⏳</span>
                    <div style={{ flex: 1 }}>
                        <strong style={{ color: '#f59e0b', fontSize: '1.05rem', display: 'block', marginBottom: '2px' }}>
                            ¡Próximo partido por cerrar!
                        </strong>
                        <span style={{ color: 'var(--text)', fontSize: '0.95rem' }}>
                            El tiempo para pronosticar el partido <strong>{urgentMatch.teamA.name} vs {urgentMatch.teamB.name}</strong> finaliza <strong>{getRemainingTimeText(urgentMatch.date!)}</strong>.
                        </span>
                    </div>
                </div>
            )}

            {stages.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No hay fases activas actualmente.</p>
                </div>
            ) : (
                stages.map(stage => {
                    const activeMatches = stage.matches.filter(m => !Boolean(m.isFinished || (m.date && new Date() >= new Date(m.date))))
                    const pastMatches = stage.matches.filter(m => Boolean(m.isFinished || (m.date && new Date() >= new Date(m.date))))

                    return (
                        <div key={stage.id} style={{ marginBottom: '32px' }}>
                            <h2 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>{stage.name}</h2>

                            {stage.matches.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)' }}>No hay partidos programados.</p>
                            ) : (
                                <>
                                    {/* Partidos Activos */}
                                    {activeMatches.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                            {activeMatches.map(match => (
                                                <PredictionCard
                                                    key={match.id}
                                                    match={match}
                                                    stageName={stage.name}
                                                    prediction={predictions[match.id]}
                                                    onSave={handleSavePrediction}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="glass-card" style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.1)' }}>
                                            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No hay partidos abiertos para pronosticar en esta fase.</p>
                                        </div>
                                    )}

                                    {/* Partidos Cerrados (Ocultos por defecto) */}
                                    {pastMatches.length > 0 && (
                                        <details style={{
                                            marginTop: '24px',
                                            padding: '16px',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 255, 255, 0.02)',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <summary style={{
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                color: 'var(--text-muted)',
                                                userSelect: 'none'
                                            }}>
                                                Ver partidos cerrados / finalizados ({pastMatches.length})
                                            </summary>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: '20px' }}>
                                                {pastMatches.map(match => (
                                                    <PredictionCard
                                                        key={match.id}
                                                        match={match}
                                                        stageName={stage.name}
                                                        prediction={predictions[match.id]}
                                                        onSave={handleSavePrediction}
                                                    />
                                                ))}
                                            </div>
                                        </details>
                                    )}
                                </>
                            )}
                        </div>
                    )
                })
            )}
        </div>
    )
}

function PredictionCard({ match, stageName, prediction, onSave }: { match: Match, stageName: string, prediction?: Prediction, onSave: (id: string, a: number, b: number) => void }) {
    const [scoreA, setScoreA] = useState(prediction?.teamAScore ?? '')
    const [scoreB, setScoreB] = useState(prediction?.teamBScore ?? '')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const [isEditing, setIsEditing] = useState(prediction === undefined)

    const groupName = stageName === 'Fase de Grupos' ? (TEAMS.find(t => t.name === match.teamA.name)?.group || '') : ''

    const isLocked = Boolean(match.isFinished || (match.date && new Date() >= new Date(match.date)))

    const handleSave = () => {
        if (scoreA !== '' && scoreB !== '' && !isLocked) {
            setSaving(true)
            onSave(match.id, Number(scoreA), Number(scoreB))
            setTimeout(() => {
                setSaving(false)
                setSaved(true)
                setIsEditing(false)
                setTimeout(() => setSaved(false), 2000)
            }, 500)
        }
    }

    return (
        <div className="glass-card" style={{ padding: '24px 20px 20px', position: 'relative' }}>

            {groupName && <div style={{ position: 'absolute', top: 12, left: 16, fontSize: '0.8rem', fontWeight: 800, color: 'var(--secondary)' }}>{groupName.toUpperCase()}</div>}
            {match.date && <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', color: isLocked ? 'var(--danger)' : 'var(--text-muted)' }}>{new Date(match.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>}

            {isLocked && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRadius: 'var(--radius)' }}>
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '8px' }}>
            {match.isFinished ? 'Partido Finalizado' : '🔒 Pronóstico Cerrado'}
          </span>
                    {match.isFinished && (
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '16px' }}>
              Resultado: {match.teamAScore} - {match.teamBScore}
            </span>
                    )}
                    {prediction && prediction.pointsEarned !== null && (
                        <span style={{ marginTop: '8px', color: prediction.pointsEarned > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 'bold' }}>
              +{prediction.pointsEarned} pts
            </span>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '16px' }}>
                <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {match.teamA.flagUrl ? (
                        <img src={`https://flagcdn.com/w80/${match.teamA.flagUrl}.png`} width="48" alt="flag" style={{ borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }} />
                    ) : (
                        <div style={{ width: '48px', height: '32px', background: 'var(--surface-hover)', borderRadius: '6px' }} />
                    )}
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{match.teamA.name}</span>
                </div>

                <div style={{ padding: '0 16px', color: 'var(--text-muted)', fontWeight: 600 }}>vs</div>

                <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {match.teamB.flagUrl ? (
                        <img src={`https://flagcdn.com/w80/${match.teamB.flagUrl}.png`} width="48" alt="flag" style={{ borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }} />
                    ) : (
                        <div style={{ width: '48px', height: '32px', background: 'var(--surface-hover)', borderRadius: '6px' }} />
                    )}
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{match.teamB.name}</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
                <input
                    type="number"
                    className="input"
                    style={{
                        width: '80px', textAlign: 'center', fontSize: '1.5rem', padding: '8px',
                        opacity: !isEditing ? 0.6 : 1,
                        cursor: !isEditing ? 'default' : 'text'
                    }}
                    value={scoreA}
                    onChange={e => setScoreA(e.target.value)}
                    min={0}
                    placeholder="-"
                    disabled={Boolean(!isEditing || isLocked)}
                />
                <input
                    type="number"
                    className="input"
                    style={{
                        width: '80px', textAlign: 'center', fontSize: '1.5rem', padding: '8px',
                        opacity: !isEditing ? 0.6 : 1,
                        cursor: !isEditing ? 'default' : 'text'
                    }}
                    value={scoreB}
                    onChange={e => setScoreB(e.target.value)}
                    min={0}
                    placeholder="-"
                    disabled={Boolean(!isEditing || isLocked)}
                />
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                {!isEditing && !isLocked ? (
                    <button
                        className="btn btn-surface"
                        style={{ width: '100%', borderColor: 'var(--border)' }}
                        onClick={() => setIsEditing(true)}
                    >
                        Editar
                    </button>
                ) : (
                    <button
                        className={`btn ${saved ? 'btn-surface' : 'btn-primary'}`}
                        style={{ width: '100%', borderColor: saved ? 'var(--success)' : 'transparent', color: saved ? 'var(--success)' : undefined }}
                        onClick={handleSave}
                        disabled={Boolean(saving || scoreA === '' || scoreB === '' || isLocked)}
                    >
                        {saving ? 'Guardando...' : saved ? '¡Guardado!' : isLocked ? 'Cerrado' : 'Guardar'}
                    </button>
                )}
            </div>
        </div>
    )
}