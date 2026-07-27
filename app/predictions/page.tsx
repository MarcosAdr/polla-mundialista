'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TEAMS } from '@/lib/teams'
import PodiumForm from '@/components/PodiumForm'

type Team = { id: string, name: string, flagUrl?: string | null }
type Match = { id: string, teamA: Team, teamB: Team, isFinished: boolean, teamAScore: number | null, teamBScore: number | null, date?: string | null }
type Stage = { id: string, name: string, matches: Match[] }
type Prediction = { matchId: string, teamAScore: number, teamBScore: number, pointsEarned: number | null }

// FECHA LÍMITE GENERAL: Ajusta este día y hora exactos en que inicia la última fecha de grupos
const CLASIFICADOS_DEADLINE = new Date('2026-06-24T23:59:00-05:00')

export default function PredictionsPage() {
    const [stages, setStages] = useState<Stage[]>([])
    const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
    const [loading, setLoading] = useState(true)
    const [urgentMatch, setUrgentMatch] = useState<Match | null>(null)

    // Estados para el contador de clasificados
    const [countdownText, setCountdownText] = useState('')
    const [isQualifiersLocked, setIsQualifiersLocked] = useState(false)

    useEffect(() => {
        // 1. Lógica del contador en tiempo real
        const updateCountdown = () => {
            const now = Date.now()
            const diffMs = CLASIFICADOS_DEADLINE.getTime() - now

            if (diffMs <= 0) {
                setIsQualifiersLocked(true)
                setCountdownText('Cerrado')
                return
            }

            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

            let text = ''
            if (days > 0) text += `${days}d `
            text += `${hours}h y ${minutes}m`
            setCountdownText(text)
        }

        updateCountdown()
        const timerInterval = setInterval(updateCountdown, 60000) // Actualiza cada minuto

        // 2. Fetch de datos iniciales
        fetch('/api/predictions')
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    const sortedStages = data.stages.map((stage: Stage) => {
                        const sortedMatches = [...stage.matches].sort((a, b) => {
                            if (!a.date) return 1;
                            if (!b.date) return -1;
                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                        });
                        return { ...stage, matches: sortedMatches };
                    });

                    setStages(sortedStages)

                    let closest: Match | null = null;
                    let minTime = Infinity;
                    const nowTime = Date.now();

                    data.stages.forEach((stage: Stage) => {
                        stage.matches.forEach((match: Match) => {
                            if (!match.isFinished && match.date) {
                                const matchTime = new Date(match.date).getTime();
                                if (matchTime > nowTime && matchTime < minTime) {
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

        return () => clearInterval(timerInterval)
    }, [])

    const handleSavePrediction = async (matchId: string, scoreA: number, scoreB: number, penaltyWinner?: string | null) => {
        setPredictions(prev => ({ ...prev, [matchId]: { matchId, teamAScore: scoreA, teamBScore: scoreB, penaltyWinner, pointsEarned: null } }))

        await fetch('/api/predictions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, teamAScore: scoreA, teamBScore: scoreB, penaltyWinner })
        })
    }

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
                <p style={{ color: 'var(--text-muted)' }}>Ingresa tus predicciones para los partidos activos.</p>
            </div>

            {/* BANNER DE ALERTA GLOBAL */}
            {urgentMatch && (
                <div className="glass-card" style={{
                    borderLeft: '4px solid #f59e0b',
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

            {/* ACCESO A LOS CLASIFICADOS DE GRUPOS CON CONTADOR Y BLOQUEO */}
            <div className="glass-card" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px',
                background: isQualifiersLocked
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'linear-gradient(135deg, rgba(0, 242, 254, 0.05), rgba(79, 172, 254, 0.1))',
                border: isQualifiersLocked ? '1px solid var(--border)' : '1px solid var(--primary)',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div style={{ flex: '1 1 300px' }}>
                    <h3 style={{ margin: '0 0 8px 0', color: isQualifiersLocked ? 'var(--text-muted)' : 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏆</span> Pronóstico de Clasificados
                    </h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.4 }}>
                        {isQualifiersLocked
                            ? 'La fase de grupos ha entrado en sus instancias finales. Este pronóstico se encuentra cerrado oficialmente.'
                            : 'Asegura puntos extra prediciendo qué selecciones superarán la Fase de Grupos. ¡Selecciona a los 32 clasificados ahora!'
                        }
                    </p>
                </div>

                
                {/* CAMBIO DINÁMICO: Si está bloqueado quita el botón y pone el estado */}
                {isQualifiersLocked ? (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        padding: '12px 24px',
                        borderRadius: 'var(--radius)',
                        fontWeight: 'bold',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        whiteSpace: 'nowrap'
                    }}>
                        🔒 Pronóstico Cerrado
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '12px' }}>
                            ⏳ Cierra en: {countdownText}
                        </span>
                        <Link href="/predictions/qualifiers" style={{ textDecoration: 'none' }}>
                            <button className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '10px 20px', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)' }}>
                                Elegir Clasificados
                            </button>
                        </Link>
                    </div>
                )}
            </div>

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

                                    {/* Partidos Cerrados */}
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
            <div style={{ marginTop: '40px', borderTop: '2px solid var(--border)', paddingTop: '40px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>🏆 Podio Final del Mundial</h2>
                <PodiumForm />
            </div>
        </div>
    )
}



// COMPONENTE PREDICTION CARD ACTUALIZADO CON MODO EDICIÓN
function PredictionCard({ match, stageName, prediction, onSave }: any) {
    const [scoreA, setScoreA] = useState<number | string>(prediction?.teamAScore ?? '')
    const [scoreB, setScoreB] = useState<number | string>(prediction?.teamBScore ?? '')
    const [penaltyWinner, setPenaltyWinner] = useState<'A' | 'B' | null>(prediction?.penaltyWinner ?? null)

    const [saving, setSaving] = useState(false)

    // NUEVA LÓGICA: ¿Estamos en modo edición?
    // Si ya existe un pronóstico válido en la base de datos, empezamos en modo lectura (false)
    // Si es un partido nuevo sin pronóstico, empezamos en modo edición (true)
    const hasExistingPrediction = prediction?.teamAScore !== undefined && prediction?.teamAScore !== null;
    const [isEditing, setIsEditing] = useState(!hasExistingPrediction)

    const isFinished = match.isFinished
    const hasStarted = match.date && new Date() >= new Date(match.date)

    // Bloqueado definitivo por el sistema (el partido ya empezó o terminó)
    const lockedByTime = isFinished || hasStarted

    // Las casillas se bloquean si el sistema lo bloquea, O si NO estamos en modo edición
    const inputsDisabled = lockedByTime || !isEditing

    const isKnockout = stageName !== 'Fase de Grupos'
    const isDraw = scoreA !== '' && scoreB !== '' && Number(scoreA) === Number(scoreB)

    const handleSave = async () => {
        if (scoreA === '' || scoreB === '') return

        if (isKnockout && isDraw && !penaltyWinner) {
            alert("En fases eliminatorias, si pronosticas un empate, debes elegir quién avanzará en penales.")
            return
        }

        setSaving(true)
        const finalPenaltyWinner = (isKnockout && isDraw) ? penaltyWinner : null
        await onSave(match.id, Number(scoreA), Number(scoreB), finalPenaltyWinner)

        setSaving(false)
        // Apenas termina de guardar, salimos del modo edición para proteger las casillas
        setIsEditing(false)
    }

    return (
        <div className="glass-card" style={{ padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {match.date && <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(match.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    {match.teamA.flagUrl && <img src={`https://flagcdn.com/w40/${match.teamA.flagUrl}.png`} width="24" alt="flag" style={{ borderRadius: '4px' }} />}
                    <span style={{ fontWeight: 'bold' }}>{match.teamA.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                    <span style={{ fontWeight: 'bold' }}>{match.teamB.name}</span>
                    {match.teamB.flagUrl && <img src={`https://flagcdn.com/w40/${match.teamB.flagUrl}.png`} width="24" alt="flag" style={{ borderRadius: '4px' }} />}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center' }}>
                {/* Ahora usamos inputsDisabled para saber si bloquear la casilla */}
                <input type="number" className="input" style={{ width: '60px', textAlign: 'center' }} value={scoreA} onChange={e => setScoreA(e.target.value)} disabled={inputsDisabled} min={0} />
                <span style={{ color: 'var(--text-muted)' }}>-</span>
                <input type="number" className="input" style={{ width: '60px', textAlign: 'center' }} value={scoreB} onChange={e => setScoreB(e.target.value)} disabled={inputsDisabled} min={0} />
            </div>

            {isKnockout && isDraw && !lockedByTime && (
                <div style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px solid var(--primary)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--primary)', margin: '0 0 8px 0', fontWeight: 'bold' }}>¿Quién clasifica?</p>
                    {/* Se bloquea también si no estamos en modo edición */}
                    <select className="input" value={penaltyWinner || ''} onChange={e => setPenaltyWinner(e.target.value as 'A' | 'B')} style={{ width: '100%' }} disabled={inputsDisabled}>
                        <option value="" disabled>Selecciona el ganador...</option>
                        <option value="A">{match.teamA.name}</option>
                        <option value="B">{match.teamB.name}</option>
                    </select>
                </div>
            )}

            {lockedByTime && prediction?.penaltyWinner && isKnockout && prediction.teamAScore === prediction.teamBScore && (
                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                    Pusiste que avanzaba: {prediction.penaltyWinner === 'A' ? match.teamA.name : match.teamB.name}
                </div>
            )}

            {!lockedByTime ? (
                // BOTONES DINÁMICOS: Muestra Guardar o Editar dependiendo del estado
                isEditing ? (
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
                        {saving ? 'Guardando...' : 'Guardar Pronóstico'}
                    </button>
                ) : (
                    <button className="btn btn-surface" onClick={() => setIsEditing(true)} style={{ width: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                        Editar
                    </button>
                )
            ) : (
                <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {isFinished ? `Finalizó: ${match.teamAScore} - ${match.teamBScore}` : 'Partido bloqueado'}
                    </span>
                    {prediction?.pointsEarned !== null && prediction?.pointsEarned !== undefined && (
                        <div style={{ color: 'var(--success)', fontWeight: 'bold', marginTop: '4px' }}>+{prediction.pointsEarned} pts</div>
                    )}
                </div>
            )}
        </div>
    )
}