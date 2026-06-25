import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// ÚNICA DECLARACIÓN DE LA FECHA LÍMITE (Con zona horaria de Ecuador)
const CLASIFICADOS_DEADLINE = new Date('2026-06-24T23:59:00-05:00')

export async function GET() {
    const session = await getSession()
    if (!session || !session.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    try {
        const predictions = await prisma.groupQualifierPrediction.findMany({
            where: { userId: session.user.id },
            select: { teamName: true, groupName: true }
        })
        return NextResponse.json(predictions)
    } catch (error) {
        return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getSession()

    // Verificamos bien la sesión y el ID
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Usamos la constante global (No la declaramos de nuevo)
    const now = new Date()
    if (now >= CLASIFICADOS_DEADLINE) {
        console.log("🚨 BLOQUEADO POR TIEMPO. Hora actual:", now, "Límite:", CLASIFICADOS_DEADLINE)
        return NextResponse.json({ error: 'El período para modificar los clasificados ha expirado.' }, { status: 400 })
    }

    try {
        const { selections } = await req.json() // [{ teamName, groupName }, ...]

        // Usamos una transacción para borrar lo viejo y guardar lo nuevo de golpe
        await prisma.$transaction(async (tx) => {
            await tx.groupQualifierPrediction.deleteMany({
                where: { userId: session.user.id }
            })

            if (selections && selections.length > 0) {
                await tx.groupQualifierPrediction.createMany({
                    data: selections.map((s: { teamName: string, groupName: string }) => ({
                        userId: session.user.id,
                        teamName: s.teamName,
                        groupName: s.groupName
                    }))
                })
            }
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        // Imprime el error exacto en la consola si Prisma falla
        console.error("🚨 ERROR CRÍTICO AL GUARDAR PREDICCIONES:", error.message || error)
        return NextResponse.json({ error: 'Error al guardar predicciones' }, { status: 500 })
    }
}