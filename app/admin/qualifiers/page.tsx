'use client'

import { useState } from 'react'
import { TEAMS } from '@/lib/teams'

export default function AdminQualifiersPage() {
    const [selections, setSelections] = useState<Record<string, string[]>>({})
    const [evaluating, setEvaluating] = useState(false)

    const groups = Array.from(new Set(TEAMS.map(t => t.group))).sort()

    const toggleTeam = (groupName: string, teamName: string) => {
        setSelections(prev => {
            const groupSelected = prev[groupName] || []
            const isCurrentlySelected = groupSelected.includes(teamName)

            if (isCurrentlySelected) {
                return { ...prev, [groupName]: groupSelected.filter(t => t !== teamName) }
            }

            if (groupSelected.length >= 3) {
                alert("No puedes elegir más de 3 equipos por grupo.")
                return prev
            }

            if (groupSelected.length === 2) {
                const groupsWithThree = Object.values(prev).filter(g => g.length === 3).length
                if (groupsWithThree >= 8) {
                    alert("Ya seleccionaste a los 8 mejores terceros.")
                    return prev
                }
            }

            return { ...prev, [groupName]: [...groupSelected, teamName] }
        })
    }

    const totalSelectedCount = Object.values(selections).flat().length
    const allGroupsHaveMinTwo = groups.every(g => (selections[g]?.length || 0) >= 2)
    const isReadyToEvaluate = totalSelectedCount === 32 && allGroupsHaveMinTwo

    const handleEvaluate = async () => {
        if (!isReadyToEvaluate) return

        if (!confirm('🚨 ATENCIÓN 🚨\n¿Estás seguro de que estos son los 32 clasificados OFICIALES? Esta acción calculará y sumará los puntos a todos los usuarios de forma irreversible.')) {
            return
        }

        setEvaluating(true)
        const officialTeams = Object.values(selections).flat()

        try {
            const res = await fetch('/api/admin/evaluate-qualifiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ officialTeams })
            })

            if (res.ok) {
                alert('✅ ¡Evaluación exitosa! Los puntos han sido sumados a los usuarios.')
                window.location.href = '/' // Redirigir a la tabla de posiciones
            } else {
                alert("Error al procesar los puntos.")
            }
        } catch (error) {
            alert("Error de conexión.")
        } finally {
            setEvaluating(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '80px' }}>

            <div style={{ textAlign: 'center', borderBottom: '2px solid var(--danger)', paddingBottom: '16px' }}>
                <h1 style={{ color: 'var(--danger)' }}>👑 Panel Admin: Evaluar Clasificados</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Selecciona a los 32 equipos que pasaron a 16avos <strong>en la vida real</strong>.<br/>
                    Al evaluar, el sistema cruzará estos datos con los de todos los usuarios y repartirá los puntos.
                </p>
            </div>

            <div style={{
                position: 'sticky',
                top: '20px',
                zIndex: 50,
                background: 'rgba(239, 68, 68, 0.1)', // Fondo rojizo para recordar que es Admin
                backdropFilter: 'blur(10px)',
                border: `1px solid ${isReadyToEvaluate ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
                <div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isReadyToEvaluate ? 'var(--danger)' : 'var(--text)' }}>
            {totalSelectedCount} / 32
          </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.9rem' }}>Equipos Oficiales</span>
                </div>

                <button
                    className="btn"
                    style={{
                        background: isReadyToEvaluate ? 'var(--danger)' : 'var(--surface)',
                        color: '#fff',
                        opacity: (!isReadyToEvaluate || evaluating) ? 0.5 : 1,
                        cursor: (!isReadyToEvaluate || evaluating) ? 'not-allowed' : 'pointer'
                    }}
                    onClick={handleEvaluate}
                    disabled={!isReadyToEvaluate || evaluating}
                >
                    {evaluating ? 'Procesando Puntos...' : '🏆 Calcular y Repartir Puntos'}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {groups.map(groupName => {
                    const groupTeams = TEAMS.filter(t => t.group === groupName)
                    const selectedInThisGroup = selections[groupName] || []

                    return (
                        <div key={groupName} className="glass-card" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, color: 'var(--secondary)' }}>Grupo {groupName}</h3>
                                <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  {selectedInThisGroup.length} clasificados
                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {groupTeams.map(team => {
                                    const isSelected = selectedInThisGroup.includes(team.name)
                                    return (
                                        <div
                                            key={team.name}
                                            onClick={() => toggleTeam(groupName, team.name)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                borderRadius: '8px',
                                                background: isSelected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                border: `1px solid ${isSelected ? 'var(--danger)' : 'transparent'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {team.code && <img src={`https://flagcdn.com/w40/${team.code}.png`} width="24" alt="flag" style={{ borderRadius: '4px' }} />}
                                            <span style={{ fontWeight: isSelected ? 800 : 500, color: isSelected ? 'var(--text)' : 'var(--text-muted)', flex: 1 }}>
                        {team.name}
                      </span>
                                            {isSelected && <span style={{ color: 'var(--danger)' }}>✔️</span>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}