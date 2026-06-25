import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// FIJAMOS LA FECHA LÍMITE AQUÍ TAMBIÉN (Añadimos -05:00 para asegurar la zona horaria de Ecuador y evitar bugs)
const CLASIFICADOS_DEADLINE = new Date('2026-06-25T23:59:00-05:00')

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
    if (!session || !session.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const CLASIFICADOS_DEADLINE = new Date('2026-06-24T23:59:00') // Debe ser la misma fecha del frontend
    if (new Date() >= CLASIFICADOS_DEADLINE) {
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
    } catch (error) {
        return NextResponse.json({ error: 'Error al guardar predicciones' }, { status: 500 })
    }
}