import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Create Admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  // Create Settings
  const settings = await prisma.settings.findFirst()
  if (!settings) {
    await prisma.settings.create({
      data: {
        exactMatchPoints: 3,
        tendencyPoints: 1,
        drawPoints: 1,
      },
    })
  }

  // Create initial stages
  const stages = ['Fase de Grupos', 'Dieciseisavos de Final', 'Octavos de Final', 'Cuartos de Final', 'Semifinal', 'Final']
  for (const [index, stageName] of stages.entries()) {
    await prisma.tournamentStage.upsert({
      where: { name: stageName },
      update: {},
      create: {
        name: stageName,
        isActive: index === 0, // First stage is active by default
      },
    })
  }

  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
