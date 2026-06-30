import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtenemos las fases activas
  const stages = await prisma.tournamentStage.findMany({
    where: { isActive: true },
    include: {
      matches: {
        include: { teamA: true, teamB: true }
      }
    }
  })

  // Obtenemos las predicciones del usuario
  const predictions = await prisma.prediction.findMany({
    where: { userId: session.user.id }
  })

  return NextResponse.json({ stages, predictions })
}

export async function POST(request: Request) {
  const session = await getSession()

  // 1. CANDADO DE SEGURIDAD MÁS ROBUSTO
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'No autorizado o sesión expirada' }, { status: 401 })
  }

  try {
    // 2. AHORA RECIBIMOS TAMBIÉN EL penaltyWinner
    const { matchId, teamAScore, teamBScore, penaltyWinner } = await request.json()

    // Validar que los marcadores no vengan vacíos
    if (teamAScore === undefined || teamBScore === undefined || teamAScore === '' || teamBScore === '') {
      return NextResponse.json({ error: 'Faltan los marcadores' }, { status: 400 })
    }

    // Buscamos el partido y su fase (para saber si es eliminatoria)
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { stage: true }
    })

    if (!match) return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    if (match.isFinished) return NextResponse.json({ error: 'El partido ya terminó' }, { status: 400 })

    if (match.date) {
      const matchTime = new Date(match.date).getTime()
      if (Date.now() >= matchTime) {
        return NextResponse.json({ error: 'El partido ya ha comenzado o finalizado' }, { status: 403 })
      }
    }

    // 3. VALIDACIÓN DE PENALES
    const isKnockout = match.stage.name !== 'Fase de Grupos'
    const isDraw = Number(teamAScore) === Number(teamBScore)
    let finalPenaltyWinner = null

    // Si es eliminatoria y el usuario puso empate, debemos asegurarnos de que haya elegido un ganador
    if (isKnockout && isDraw) {
      if (!penaltyWinner) {
        return NextResponse.json({ error: 'Falta elegir al ganador de los penales' }, { status: 400 })
      }
      finalPenaltyWinner = penaltyWinner
    }

    // 4. GUARDADO (UPSERT) ACTUALIZADO
    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId: session.user.id, matchId }
      },
      update: {
        teamAScore: Number(teamAScore),
        teamBScore: Number(teamBScore),
        penaltyWinner: finalPenaltyWinner // Guardamos el ganador de penales
      },
      create: {
        userId: session.user.id,
        matchId,
        teamAScore: Number(teamAScore),
        teamBScore: Number(teamBScore),
        penaltyWinner: finalPenaltyWinner // Guardamos el ganador de penales
      }
    })

    return NextResponse.json(prediction)

  } catch (error: any) {
    console.error("🚨 ERROR AL GUARDAR PRONÓSTICO:", error.message || error)
    return NextResponse.json({ error: 'Error interno al guardar pronóstico' }, { status: 500 })
  }
}