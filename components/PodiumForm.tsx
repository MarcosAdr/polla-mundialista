'use client'
import { useState, useEffect } from 'react'
import { TEAMS } from '@/lib/teams'

export default function PodiumForm() {
    const [champion, setChampion] = useState('')
    const [second, setSecond] = useState('')
    const [third, setThird] = useState('')
    const [saving, setSaving] = useState(false)
    const [locked, setLocked] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/predictions/podium')
            .then(res => res.json())
            .then(data => {
                if (data.podium) {
                    setChampion(data.podium.championName)
                    setSecond(data.podium.secondPlaceName)
                    setThird(data.podium.thirdPlaceName)
                    setLocked(true)
                }
                setLoading(false)
            })
    }, [])

    const handleSave = async () => {
        if (!champion || !second || !third) return alert("Completa los 3 lugares")
        if (!confirm("⚠️ Una vez guardado tu podio, NO podrás modificarlo. ¿Estás seguro?")) return

        setSaving(true)
        const res = await fetch('/api/predictions/podium', {
            method: 'POST',
            body: JSON.stringify({ champion, second, third })
        })

        if (res.ok) {
            setLocked(true)
            alert("¡Podio guardado y bloqueado!")
        }
        setSaving(false)
    }

    const availableTeams = (exclude: string[]) => TEAMS.filter(t => !exclude.includes(t.name))

    if (loading) return null

    return (
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px', margin: '0 auto' }}>

            {/* NOTIFICACIÓN DINÁMICA */}
            <div style={{
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: 'bold',
                marginBottom: '8px',
                background: locked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0, 242, 254, 0.1)',
                color: locked ? '#10b981' : 'var(--primary)',
                border: locked ? '1px solid #10b981' : '1px solid var(--primary)'
            }}>
                {locked
                    ? "✅ Ya has ingresado tu podio. ¡Suerte!"
                    : "⚠️ Ingresa tu podio. ¡No podrás modificarlo después!"}
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.8rem' }}>🥇 Campeón</label>
                <select className="input" value={champion} onChange={(e) => setChampion(e.target.value)} disabled={locked} style={{ width: '100%' }}>
                    <option value="">Selecciona...</option>
                    {TEAMS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.8rem' }}>🥈 Segundo Lugar</label>
                <select className="input" value={second} onChange={(e) => setSecond(e.target.value)} disabled={locked} style={{ width: '100%' }}>
                    <option value="">Selecciona...</option>
                    {availableTeams([champion]).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            </div>

            <div>
                <label style={{ display: 'block', fontSize: '0.8rem' }}>🥉 Tercer Lugar</label>
                <select className="input" value={third} onChange={(e) => setThird(e.target.value)} disabled={locked} style={{ width: '100%' }}>
                    <option value="">Selecciona...</option>
                    {availableTeams([champion, second]).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
            </div>

            {!locked && (
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: '100%' }}>
                    {saving ? 'Guardando...' : 'Guardar Podio Final'}
                </button>
            )}
        </div>
    )
}