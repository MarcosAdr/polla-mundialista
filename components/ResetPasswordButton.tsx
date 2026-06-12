'use client'

import { useState } from 'react'

export default function ResetPasswordButton({ userId, username }: { userId: string, username: string }) {
    const [loading, setLoading] = useState(false)

    const handleReset = async () => {
        // Pedimos confirmación para evitar clics accidentales
        if (!window.confirm(`¿Seguro que deseas resetear la contraseña de ${username} a "123456"?`)) return

        setLoading(true)
        try {
            const res = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            })

            if (res.ok) {
                alert(`¡Éxito! La nueva contraseña de ${username} es: 123456`)
            } else {
                const data = await res.json()
                alert(data.error || 'Error al resetear')
            }
        } catch (error) {
            alert('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleReset}
            disabled={loading}
            style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer'
            }}
        >
            {loading ? 'Cargando...' : 'Reset Clave'}
        </button>
    )
}