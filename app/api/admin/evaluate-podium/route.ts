import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
    const session = await getSession()
    if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { officialChampion, officialSecond, officialThird } = await req.json()

    const podiums = await prisma.worldCupPodium.findMany()

    const updates = podiums.map(p => {
        let points = 0
        if (p.championName === officialChampion) points += 20
        if (p.secondPlaceName === officialSecond) points += 10
        if (p.thirdPlaceName === officialThird) points += 5

        // Bonus por "Pleno" (acertar los 3)
        if (points === 35) points += 5 // 35 + 5 = 40 puntos totales

        if (points > 0) {
            return prisma.user.update({
                where: { id: p.userId },
                data: { totalPoints: { increment: points } }
            })
        }
        return null
    }).filter(Boolean)

    await prisma.$transaction(updates as any)
    return NextResponse.json({ success: true })
}