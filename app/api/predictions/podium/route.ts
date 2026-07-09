import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const PODIUM_DEADLINE = new Date('2026-07-09T15:00:00-05:00')

export async function POST(req: Request) {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    if (new Date() >= PODIUM_DEADLINE) {
        return NextResponse.json({ error: 'El plazo ha expirado' }, { status: 403 })
    }
    
    const { champion, second, third } = await req.json()

    // Guardar o actualizar (upsert) el podio
    await prisma.worldCupPodium.upsert({
        where: { userId: session.user.id },
        update: { championName: champion, secondPlaceName: second, thirdPlaceName: third },
        create: { userId: session.user.id, championName: champion, secondPlaceName: second, thirdPlaceName: third }
    })
       
    return NextResponse.json({ success: true })    
}

// Añade esto a tu archivo de API
export async function GET() {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const podium = await prisma.worldCupPodium.findUnique({
        where: { userId: session.user.id }
    })
    return NextResponse.json({ podium })
}