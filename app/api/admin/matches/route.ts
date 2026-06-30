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
    // =========================================================================
    // 1. TOMAR LA FOTOGRAFÍA DE POSICIONES ANTERIORES
    // =========================================================================
    const usersRanked = await prisma.user.findMany({
      where: { role: 'USER' },
      orderBy: { totalPoints: 'desc' }
    });

    const rankPromises = usersRanked.map((u, index) => {
      return prisma.user.update({
        where: { id: u.id },
        data: { previousPosition: index + 1 }
      });
    });

    await prisma.$transaction(rankPromises);


    // =========================================================================
    // 2. EXTRAER TODO DEL REQUEST AQUÍ (SOLO UNA LECTURA GLOBAL)
    // =========================================================================
    const { matchId, teamAScore, teamBScore, penaltyWinner } = await request.json()
    const finalScoreA = Number(teamAScore)
    const finalScoreB = Number(teamBScore)

    // Actualizamos el partido real incluyendo quién fue el penaltyWinner en la BD
    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        teamAScore: finalScoreA,
        teamBScore: finalScoreB,
        isFinished: true,
        penaltyWinner: finalScoreA === finalScoreB ? penaltyWinner : null
      }
    })

    // Configuración de puntos de la app
    const settings = await prisma.settings.findFirst()
    const exactPts = settings?.exactMatchPoints || 3
    const tendencyPts = settings?.tendencyPoints || 1
    const drawPts = settings?.drawPoints || 1

    const matchOutcome = finalScoreA > finalScoreB ? 'A' : finalScoreA < finalScoreB ? 'B' : 'DRAW'

    // Buscamos todas las predicciones de este partido
    const predictions = await prisma.prediction.findMany({
      where: { matchId }
    })

    // Validamos la fase del torneo
    const matchData = await prisma.match.findUnique({ where: { id: matchId }, include: { stage: true }})
    const isKnockout = matchData?.stage.name !== 'Fase de Grupos'

    // =========================================================================
    // 3. CICLO DE USUARIOS (YA NO TIENE LECTURAS DE REQUEST INTERNAS)
    // =========================================================================
    for (const pred of predictions) {
      let points = 0

      const predOutcome = pred.teamAScore > pred.teamBScore ? 'A' : pred.teamAScore < pred.teamBScore ? 'B' : 'DRAW'

      if (isKnockout) {
        // Usamos las variables globales obtenidas en el paso 2
        const realAdvancingTeam = matchOutcome === 'DRAW' ? penaltyWinner : matchOutcome
        const predAdvancingTeam = predOutcome === 'DRAW' ? pred.penaltyWinner : predOutcome

        if (matchOutcome === 'DRAW') {
          if (predOutcome === 'DRAW' && pred.penaltyWinner === penaltyWinner) {
            points = 4 // Empate + Ganador exacto de penales
          } else if (predAdvancingTeam === realAdvancingTeam) {
            points = 2 // No le dio al empate pero sí al que clasificó
          } else {
            points = 0
          }
        } else {
          if (pred.teamAScore === finalScoreA && pred.teamBScore === finalScoreB) {
            points = exactPts
          } else if (predAdvancingTeam === realAdvancingTeam) {
            points = tendencyPts
          } else {
            points = 0
          }
        }
      } else {
        // Fase de Grupos regular
        if (pred.teamAScore === finalScoreA && pred.teamBScore === finalScoreB) {
          points = exactPts
        } else if (matchOutcome === 'DRAW' && predOutcome === 'DRAW') {
          points = drawPts
        } else if (predOutcome === matchOutcome && matchOutcome !== 'DRAW') {
          points = tendencyPts
        }
      }

      // Guardamos los puntos de esta predicción
      await prisma.prediction.update({
        where: { id: pred.id },
        data: { pointsEarned: points }
      })

      // Recalculamos y actualizamos de inmediato el puntaje total del usuario
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
  } catch (error: any) {
    console.error("🚨 ERROR CRÍTICO EN EVALUACIÓN DE PARTIDO:", error.message || error)
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