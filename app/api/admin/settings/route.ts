import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let settings = await prisma.settings.findFirst()
  if (!settings) {
    settings = await prisma.settings.create({ data: { exactMatchPoints: 3, tendencyPoints: 1, drawPoints: 1 } })
  }
  return NextResponse.json(settings)
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const { exactMatchPoints, tendencyPoints, drawPoints } = await request.json()
    const settings = await prisma.settings.findFirst()
    
    if (settings) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: {
          exactMatchPoints: Number(exactMatchPoints),
          tendencyPoints: Number(tendencyPoints),
          drawPoints: Number(drawPoints)
        }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}
