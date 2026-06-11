import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Fetch active stages and their matches
  const stages = await prisma.tournamentStage.findMany({
    where: { isActive: true },
    include: {
      matches: {
        include: { teamA: true, teamB: true }
      }
    }
  })

  // Fetch user predictions
  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id }
  })

  return NextResponse.json({ stages, predictions })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    const { matchId, teamAScore, teamBScore } = await request.json()

    // Ensure match is not finished
    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match || match.isFinished) {
      return NextResponse.json({ error: 'El partido ya terminó' }, { status: 400 })
    }

    if (match.date && new Date() >= match.date) {
      return NextResponse.json({ error: 'El partido ya ha comenzado o finalizado' }, { status: 403 })
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId: session.user.id, matchId }
      },
      update: {
        teamAScore: Number(teamAScore),
        teamBScore: Number(teamBScore)
      },
      create: {
        userId: session.user.id,
        matchId,
        teamAScore: Number(teamAScore),
        teamBScore: Number(teamBScore)
      }
    })

    return NextResponse.json(prediction)
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar pronóstico' }, { status: 500 })
  }
}
