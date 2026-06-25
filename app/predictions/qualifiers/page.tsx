'use client'

import { useState, useEffect } from 'react'
import { TEAMS } from '@/lib/teams'

// MISMA FECHA LÍMITE QUE EN EL RESTO DE LA APP
const CLASIFICADOS_DEADLINE = new Date('2026-06-24T23:59:00-05:00')

export default function QualifiersPage() {
    // Estado que guarda las selecciones mapeadas por grupo: { 'A': ['Ecuador', 'Holanda'], 'B': [...] }
    const [selections, setSelections] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savedMessage, setSavedMessage] = useState('')

    // Estados para el bloqueo y contador de tiempo
    const [isLocked, setIsLocked] = useState(false)
    const [countdownText, setCountdownText] = useState('')

    // Agrupamos los equipos por su grupo correspondiente
    const groups = Array.from(new Set(TEAMS.map(t => t.group))).sort()

    useEffect(() => {
        // 1. Lógica del contador de tiempo y bloqueo
        const updateCountdown = () => {
            const now = Date.now()
            const diffMs = CLASIFICADOS_DEADLINE.getTime() - now

            if (diffMs <= 0) {
                setIsLocked(true)
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
        const timerInterval = setInterval(updateCountdown, 60000)

        // 2. Cargar las selecciones previas del usuario
        fetch('/api/predictions/qualifiers')
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    const loadedSelections: Record<string, string[]> = {}
                    data.forEach((p: { groupName: string, teamName: string }) => {
                        if (!loadedSelections[p.groupName]) loadedSelections[p.groupName] = []
                        loadedSelections[p.groupName].push(p.teamName)
                    })
                    setSelections(loadedSelections)
                }
                setLoading(false)
            })

        return () => clearInterval(timerInterval)
    }, [])

    const toggleTeam = (groupName: string, teamName: string) => {
        // BLOQUEO CRÍTICO: Si el tiempo expiró, ignoramos los clics
        if (isLocked) return;

        setSelections(prev => {
            const groupSelected = prev[groupName] || []
            const isCurrentlySelected = groupSelected.includes(teamName)

            // Si ya está seleccionado, lo quitamos
            if (isCurrentlySelected) {
                return { ...prev, [groupName]: groupSelected.filter(t => t !== teamName) }
            }

            // Si vamos a seleccionar uno nuevo, aplicamos las reglas
            if (groupSelected.length >= 3) {
                alert("🚨 No puedes elegir más de 3 equipos por grupo.")
                return prev
            }

            if (groupSelected.length === 2) {
                // Validar si ya tenemos 8 grupos con 3 equipos
                const groupsWithThree = Object.values(prev).filter(g => g.length === 3).length
                if (groupsWithThree >= 8) {
                    alert("🚨 Ya has elegido a los 8 mejores terceros. Para agregar otro, debes deseleccionar un tercero de otro grupo.")
                    return prev
                }
            }

            // Si pasa todas las validaciones, lo agregamos
            return { ...prev, [groupName]: [...groupSelected, teamName] }
        })
    }

    // Comprobar si cumple con la regla de oro: Exactamente 32 equipos seleccionados
    const totalSelectedCount = Object.values(selections).flat().length

    // Comprobar que todos los grupos tengan al menos 2 equipos
    const allGroupsHaveMinTwo = groups.every(g => (selections[g]?.length || 0) >= 2)

    const isReadyToSave = totalSelectedCount === 32 && allGroupsHaveMinTwo

    const handleSave = async () => {
        if (!isReadyToSave || isLocked) return
        setSaving(true)
        setSavedMessage('')

        const flatSelections = Object.entries(selections).flatMap(([groupName, teams]) =>
            teams.map(teamName => ({ groupName, teamName }))
        )

        try {
            const res = await fetch('/api/predictions/qualifiers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selections: flatSelections })
            })

            if (res.ok) {
                setSavedMessage('¡Clasificados guardados con éxito!')
                setTimeout(() => setSavedMessage(''), 4000)
            } else {
                alert("Error al guardar (Posiblemente el tiempo expiró)")
            }
        } catch (error) {
            alert("Error de red")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div style={{ textAlign: 'center', marginTop: '40px' }}>Cargando tus selecciones...</div>

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '80px' }}>

            <div style={{ textAlign: 'center' }}>
                <h1>Clasificados a 16avos</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                    Selecciona exactamente a los <strong>32 equipos</strong> que avanzarán. <br/>
                    (2 por grupo + los 8 mejores terceros).
                </p>

                {/* AVISO DE ESTADO DE BLOQUEO DEBAJO DEL TÍTULO */}
                {isLocked && (
                    <div style={{ marginTop: '16px', display: 'inline-block', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 16px', borderRadius: '16px', fontWeight: 'bold' }}>
                        🔒 La etapa de pronósticos está cerrada. Estás viendo tus selecciones finales.
                    </div>
                )}
            </div>

            {/* Panel Sticky flotante para mostrar el progreso */}
            <div style={{
                position: 'sticky',
                top: '20px',
                zIndex: 50,
                background: 'rgba(10, 10, 10, 0.85)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${isLocked ? 'var(--danger)' : isReadyToSave ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
                <div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isLocked ? 'var(--text-muted)' : isReadyToSave ? 'var(--success)' : 'var(--text)' }}>
                    {totalSelectedCount} / 32
                  </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.9rem' }}>Equipos seleccionados</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* MOSTRAMOS EL CONTADOR O EL MENSAJE DE CERRADO */}
                    {!isLocked ? (
                        <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 'bold' }}>
                            ⏳ Cierra en: {countdownText}
                        </span>
                    ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 'bold' }}>
                            CERRADO
                        </span>
                    )}

                    {savedMessage && <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.9rem' }}>{savedMessage}</span>}

                    <button
                        className={`btn ${isLocked ? 'btn-surface' : isReadyToSave ? 'btn-primary' : 'btn-surface'}`}
                        onClick={handleSave}
                        disabled={!isReadyToSave || saving || isLocked}
                        style={{ opacity: (!isReadyToSave || saving || isLocked) ? 0.5 : 1, cursor: (!isReadyToSave || saving || isLocked) ? 'not-allowed' : 'pointer' }}
                    >
                        {isLocked ? 'Modificación Bloqueada' : saving ? 'Guardando...' : 'Guardar Pronóstico'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {groups.map(groupName => {
                    const groupTeams = TEAMS.filter(t => t.group === groupName)
                    const selectedInThisGroup = selections[groupName] || []

                    return (
                        <div key={groupName} className="glass-card" style={{ padding: '20px', opacity: isLocked ? 0.85 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0, color: 'var(--secondary)' }}>{groupName}</h3>
                                <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                                  {selectedInThisGroup.length} elegidos
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
                                                background: isSelected ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                                border: `1px solid ${isSelected ? 'var(--primary)' : 'transparent'}`,
                                                // Si está bloqueado, quitamos la manito del cursor para indicar que no es clickeable
                                                cursor: isLocked ? 'default' : 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {team.code && <img src={`https://flagcdn.com/w40/${team.code}.png`} width="24" alt="flag" style={{ borderRadius: '4px', opacity: isLocked && !isSelected ? 0.4 : 1 }} />}
                                            <span style={{ fontWeight: isSelected ? 800 : 500, color: isSelected ? 'var(--text)' : 'var(--text-muted)', flex: 1, opacity: isLocked && !isSelected ? 0.4 : 1 }}>
                                                {team.name}
                                            </span>
                                            {isSelected && <span style={{ color: 'var(--primary)' }}>✔️</span>}
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