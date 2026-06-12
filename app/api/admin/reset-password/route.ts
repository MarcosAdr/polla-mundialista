import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs' // O bcryptjs, dependiendo de lo que uses

export async function POST(req: Request) {
    const session = await getSession()

    // Seguridad extrema: Solo si hay sesión Y el rol es ADMIN pasa de aquí
    if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    try {
        const { userId } = await req.json()

        // Hasheamos la nueva contraseña genérica "123456"
        const hashedPassword = await bcrypt.hash('123456', 10)

        // Actualizamos al usuario en la base de datos
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Error al actualizar la base de datos' }, { status: 500 })
    }
}