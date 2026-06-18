'use client'

import { useState, useEffect } from 'react'
import { TEAMS } from '@/lib/teams'

export default function QualifiersPage() {
    // Estado que guarda las selecciones mapeadas por grupo: { 'A': ['Ecuador', 'Holanda'], 'B': [...] }
    const [selections, setSelections] = useState<Record<string, string[]>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savedMessage, setSavedMessage] = useState('')

    // Agrupamos los equipos por su grupo correspondiente
    const groups = Array.from(new Set(TEAMS.map(t => t.group))).sort()

    useEffect(() => {
        // Cargar las selecciones previas del usuario
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
    }, [])

    const toggleTeam = (groupName: string, teamName: string) => {
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
        if (!isReadyToSave) return
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
                alert("Error al guardar")
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
            </div>

            {/* Panel Sticky flotante para mostrar el progreso */}
            <div style={{
                position: 'sticky',
                top: '20px',
                zIndex: 50,
                background: 'rgba(10, 10, 10, 0.85)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${isReadyToSave ? 'var(--success)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
                <div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: isReadyToSave ? 'var(--success)' : 'var(--text)' }}>
            {totalSelectedCount} / 32
          </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.9rem' }}>Equipos seleccionados</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {savedMessage && <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '0.9rem' }}>{savedMessage}</span>}
                    <button
                        className={`btn ${isReadyToSave ? 'btn-primary' : 'btn-surface'}`}
                        onClick={handleSave}
                        disabled={!isReadyToSave || saving}
                        style={{ opacity: (!isReadyToSave || saving) ? 0.5 : 1, cursor: (!isReadyToSave || saving) ? 'not-allowed' : 'pointer' }}
                    >
                        {saving ? 'Guardando...' : 'Guardar Pronóstico'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {groups.map(groupName => {
                    const groupTeams = TEAMS.filter(t => t.group === groupName)
                    const selectedInThisGroup = selections[groupName] || []

                    return (
                        <div key={groupName} className="glass-card" style={{ padding: '20px' }}>
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
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {team.code && <img src={`https://flagcdn.com/w40/${team.code}.png`} width="24" alt="flag" style={{ borderRadius: '4px' }} />}
                                            <span style={{ fontWeight: isSelected ? 800 : 500, color: isSelected ? 'var(--text)' : 'var(--text-muted)', flex: 1 }}>
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