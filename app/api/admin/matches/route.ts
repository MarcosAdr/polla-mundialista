import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const stages = await prisma.tournamentStage.findMany({
    include: {
      matches: {
        include: { teamA: true, teamB: true }
      }
    }
  })
  
  return NextResponse.json(stages)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { teamAName, teamBName, teamAFlag, teamBFlag, stageId, matchDate } = await request.json()

    // Upsert Teams
    const teamA = await prisma.team.upsert({
      where: { name: teamAName },
      update: { flagUrl: teamAFlag },
      create: { name: teamAName, flagUrl: teamAFlag }
    })

    const teamB = await prisma.team.upsert({
      where: { name: teamBName },
      update: { flagUrl: teamBFlag },
      create: { name: teamBName, flagUrl: teamBFlag }
    })

    const match = await prisma.match.create({
      data: {
        stageId,
        teamAId: teamA.id,
        teamBId: teamB.id,
        date: matchDate ? new Date(matchDate) : null,
      },
      include: { teamA: true, teamB: true }
    })

    return NextResponse.json(match)
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear partido' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { matchId, teamAScore, teamBScore } = await request.json()
    const finalScoreA = Number(teamAScore)
    const finalScoreB = Number(teamBScore)

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        teamAScore: finalScoreA,
        teamBScore: finalScoreB,
        isFinished: true,
      }
    })

    // Fetch settings for points
    const settings = await prisma.settings.findFirst()
    const exactPts = settings?.exactMatchPoints || 3
    const tendencyPts = settings?.tendencyPoints || 1
    const drawPts = settings?.drawPoints || 1

    // Calculate match outcome
    const matchOutcome = finalScoreA > finalScoreB ? 'A' : finalScoreA < finalScoreB ? 'B' : 'DRAW'

    // Fetch predictions
    const predictions = await prisma.prediction.findMany({
      where: { matchId }
    })

    // Update predictions and users
    for (const pred of predictions) {
      let points = 0
      
      const predOutcome = pred.teamAScore > pred.teamBScore ? 'A' : pred.teamAScore < pred.teamBScore ? 'B' : 'DRAW'

      if (pred.teamAScore === finalScoreA && pred.teamBScore === finalScoreB) {
        points = exactPts
      } else if (matchOutcome === 'DRAW' && predOutcome === 'DRAW') {
        points = drawPts
      } else if (predOutcome === matchOutcome && matchOutcome !== 'DRAW') {
        points = tendencyPts
      }

      await prisma.prediction.update({
        where: { id: pred.id },
        data: { pointsEarned: points }
      })

      // Recalculate user total points
      const userPredictions = await prisma.prediction.findMany({
        where: { userId: pred.userId, pointsEarned: { not: null } }
      })
      const totalPoints = userPredictions.reduce((sum, p) => sum + (p.pointsEarned || 0), 0)

      await prisma.user.update({
        where: { id: pred.userId },
        data: { totalPoints }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar partido' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('id')

    if (!matchId) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

    await prisma.prediction.deleteMany({ where: { matchId } })
    await prisma.match.delete({ where: { id: matchId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { matchId, matchDate } = await request.json()
    if (!matchId) return NextResponse.json({ error: 'Falta matchId' }, { status: 400 })

    await prisma.match.update({
      where: { id: matchId },
      data: { date: matchDate ? new Date(matchDate) : null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar fecha' }, { status: 500 })
  }
}
