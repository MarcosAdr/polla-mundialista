import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
    const session = await getSession()

    // Seguridad: Solo el ADMIN puede ejecutar esto
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    try {
        const { officialTeams } = await req.json() // Recibe el array con los 32 equipos oficiales

        if (!officialTeams || officialTeams.length !== 32) {
            return NextResponse.json({ error: 'Debes enviar exactamente 32 equipos.' }, { status: 400 })
        }

        // 1. Traemos a todos los usuarios junto con sus predicciones de clasificados
        const users = await prisma.user.findMany({
            include: { qualifierPredictions: true }
        })

        // 2. Preparamos las actualizaciones masivas
        const updatePromises = users.map(user => {
            // Extraemos solo los nombres de los equipos que eligió el usuario
            const userTeams = user.qualifierPredictions.map(p => p.teamName)

            // Contamos cuántos de esos equipos están en la lista oficial
            const hits = userTeams.filter(team => officialTeams.includes(team)).length

            // 3. Aplicamos el sistema de recompensas con rangos explícitos
            let bonusPoints = 0

            if (hits >= 25) {
                bonusPoints = 15 // De 25 aciertos en adelante (Premio Mayor)
            } else if (hits >= 20 && hits <= 24) {
                bonusPoints = 10 // Rango exacto: De 20 a 24 aciertos (Premio Intermedio)
            } else if (hits >= 15 && hits <= 19) {
                bonusPoints = 5 // Rango exacto: De 15 a 19 aciertos (Premio de Consuelo)
            }

            // Si el usuario ganó puntos, preparamos su actualización en la BD
            if (bonusPoints > 0) {
                return prisma.user.update({
                    where: { id: user.id },
                    data: { totalPoints: { increment: bonusPoints } }
                })
            }

            return null // Si no llegó a los 15 aciertos, no suma nada
        }).filter(p => p !== null) // Filtramos los nulos

        // 4. Ejecutamos todas las actualizaciones de golpe de forma segura
        await prisma.$transaction(updatePromises as any)

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Error interno al calcular puntos' }, { status: 500 })
    }
}