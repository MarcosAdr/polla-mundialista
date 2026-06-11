'use client'

import { useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const [exactMatchPoints, setExact] = useState(3)
  const [tendencyPoints, setTendency] = useState(1)
  const [drawPoints, setDraw] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setExact(data.exactMatchPoints)
          setTendency(data.tendencyPoints)
          setDraw(data.drawPoints ?? 1)
        }
        setLoading(false)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exactMatchPoints, tendencyPoints, drawPoints })
    })
    
    if (res.ok) {
      setMessage('¡Configuración guardada!')
    } else {
      setMessage('Error al guardar')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return <div>Cargando configuración...</div>

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px' }}>Configuración de Puntajes</h1>
      
      <div className="glass-card">
        {message && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            {message}
          </div>
        )}
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Puntos por Acierto Exacto</label>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Puntos otorgados si el usuario acierta el marcador idéntico (ej. Predice 2-1 y el resultado es 2-1).
            </p>
            <input 
              type="number" 
              className="input" 
              value={exactMatchPoints} 
              onChange={e => setExact(Number(e.target.value))} 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Puntos por Tendencia</label>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Puntos otorgados si el usuario acierta al ganador, pero no el marcador exacto (ej. Predice 1-0 y el resultado es 2-1).
            </p>
            <input 
              type="number" 
              className="input" 
              value={tendencyPoints} 
              onChange={e => setTendency(Number(e.target.value))} 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Puntos por Empate</label>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Puntos otorgados si el partido termina en empate y el usuario predijo un empate diferente (ej. Predice 0-0 y el resultado es 1-1). Reemplaza a los puntos de tendencia.
            </p>
            <input 
              type="number" 
              className="input" 
              value={drawPoints} 
              onChange={e => setDraw(Number(e.target.value))} 
              required 
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </form>
      </div>
    </div>
  )
}
