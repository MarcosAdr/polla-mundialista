'use client'
import { useState } from 'react'
import { TEAMS } from '@/lib/teams'
import Link from 'next/link'

export default function AdminPodiumPage() {
    const [champion, setChampion] = useState('')
    const [second, setSecond] = useState('')
    const [third, setThird] = useState('')
    const [evaluating, setEvaluating] = useState(false)

    const handleEvaluate = async () => {
        if (!champion || !second || !third) {
            alert("Debes seleccionar los 3 puestos oficiales.")
            return
        }

        if (!confirm("⚠️ ¿Estás seguro de calcular los puntos del podio? Esto actualizará la tabla general.")) return

        setEvaluating(true)
        const res = await fetch('/api/admin/evaluate-podium', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                officialChampion: champion,
                officialSecond: second,
                officialThird: third
            })
        })

        setEvaluating(false)
        if (res.ok) {
            alert("¡Puntos del podio calculados y sumados con éxito!")
        } else {
            alert("Hubo un error al evaluar el podio.")
        }
    }

    const availableTeams = (exclude: string[]) => TEAMS.filter(t => !exclude.includes(t.name))

    return (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Evaluar Podio Oficial</h1>
                <Link href="/admin/matches">
                    <button className="btn btn-surface">← Volver a Partidos</button>
                </Link>
            </div>

            <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Selecciona los resultados reales del mundial para que el sistema procese automáticamente los aciertos de los usuarios (20 pts Campeón, 10 pts Segundo, 5 pts Tercer lugar + 5 pts de bonus por pleno).
                </p>

                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>🥇 Campeón Real</label>
                    <select className="input" value={champion} onChange={(e) => setChampion(e.target.value)} style={{ width: '100%' }}>
                        <option value="">Selecciona campeón...</option>
                        {TEAMS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>🥈 Segundo Lugar Real</label>
                    <select className="input" value={second} onChange={(e) => setSecond(e.target.value)} style={{ width: '100%' }}>
                        <option value="">Selecciona segundo...</option>
                        {availableTeams([champion]).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>🥉 Tercer Lugar Real</label>
                    <select className="input" value={third} onChange={(e) => setThird(e.target.value)} style={{ width: '100%' }}>
                        <option value="">Selecciona tercero...</option>
                        {availableTeams([champion, second]).map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                    </select>
                </div>

                <button
                    className="btn"
                    onClick={handleEvaluate}
                    disabled={evaluating}
                    style={{ background: 'var(--secondary)', color: 'black', marginTop: '12px', width: '100%', fontWeight: 'bold' }}
                >
                    {evaluating ? 'Calculando Puntos...' : '👑 Ejecutar y Asignar Puntos del Podio'}
                </button>
            </div>
        </div>
    )
}