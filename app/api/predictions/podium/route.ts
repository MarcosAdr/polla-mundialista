import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

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