import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../src/generated/prisma/client'
import { DEFAULT_FORMATION, type Role } from '../src/lib/domain/types'

/**
 * Popula o banco com os integrantes e os times lidos da planilha de agosto/2026,
 * para o app ja abrir utilizavel em vez de exigir 30 cadastros na mao.
 */

type MemberSeed = { name: string; roles: Role[]; isGestor?: boolean }

const MEMBERS: MemberSeed[] = [
  { name: 'HENRY', roles: ['VOCAL_MASC'] },
  { name: 'KALEB', roles: ['VOCAL_MASC'] },
  { name: 'ELDES', roles: ['VOCAL_MASC'] },
  { name: 'GABRIEL', roles: ['VOCAL_MASC'] },

  { name: 'GI', roles: ['VOCAL_FEM'] },
  { name: 'LARISSA', roles: ['VOCAL_FEM'] },
  { name: 'REBECA', roles: ['VOCAL_FEM'] },
  { name: 'AMANDA', roles: ['VOCAL_FEM'] },
  { name: 'MANU', roles: ['VOCAL_FEM'] },
  { name: 'FLOR', roles: ['VOCAL_FEM'] },
  { name: 'BRUNA', roles: ['VOCAL_FEM'] },
  { name: 'ANNY', roles: ['VOCAL_FEM'] },
  { name: 'JULIANA', roles: ['VOCAL_FEM'] },

  { name: 'DIGO', roles: ['TECLADO'], isGestor: true },

  { name: 'DALLA', roles: ['BAIXO'] },
  // RUD toca baixo e tambem cobre o som
  { name: 'RUD', roles: ['BAIXO', 'SOM'] },
  { name: 'AMORAS', roles: ['BAIXO'], isGestor: true },

  { name: 'BRENO', roles: ['GUITARRA'] },
  { name: 'WILLIAN', roles: ['GUITARRA'], isGestor: true },
  { name: 'JOÃO', roles: ['GUITARRA'], isGestor: true },

  { name: 'RAPHA', roles: ['BATERIA'] },
  { name: 'KADU', roles: ['BATERIA'] },

  { name: 'JORGE', roles: ['SOM'] },
  { name: 'PEDRO', roles: ['SOM'] },
  { name: 'LEANDRO', roles: ['SOM'] },

  { name: 'JACKSON', roles: ['PROJECAO'] },
  { name: 'JUNIOR', roles: ['PROJECAO'] },
  { name: 'GIGI', roles: ['PROJECAO'] },
  { name: 'NESSAH', roles: ['PROJECAO'] },
  { name: 'GUI', roles: ['PROJECAO'] },
  { name: 'YASMIM', roles: ['PROJECAO'] },
]

type TeamSeed = { name: string; color: string; order: number }

/** Times nao tem gente: sao so as cores que giram de um culto para o outro. */
const TEAMS: TeamSeed[] = [
  { name: 'TIME 1', color: '#ED7D31', order: 0 },
  { name: 'TIME 2', color: '#FFFF00', order: 1 },
  { name: 'TIME 3', color: '#66EE77', order: 2 },
  { name: 'TIME 4', color: '#3DA5F4', order: 3 },
]

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  }),
})

async function main() {
  const idByName = new Map<string, string>()

  for (const spec of MEMBERS) {
    const member = await prisma.member.upsert({
      where: { name: spec.name },
      update: { isGestor: spec.isGestor ?? false, active: true },
      create: { name: spec.name, isGestor: spec.isGestor ?? false },
    })

    await prisma.memberRole.deleteMany({ where: { memberId: member.id } })
    await prisma.memberRole.createMany({
      data: spec.roles.map((role) => ({ memberId: member.id, role })),
    })

    idByName.set(spec.name, member.id)
  }

  for (const spec of TEAMS) {
    await prisma.team.upsert({
      where: { name: spec.name },
      update: { color: spec.color, order: spec.order, active: true },
      create: { name: spec.name, color: spec.color, order: spec.order },
    })
  }

  for (const [role, count] of Object.entries(DEFAULT_FORMATION)) {
    await prisma.formation.upsert({
      where: { role },
      update: { count },
      create: { role, count },
    })
  }

  await prisma.serviceException.upsert({
    where: { date: new Date(Date.UTC(2026, 9, 18)) },
    update: {},
    create: { date: new Date(Date.UTC(2026, 9, 18)), kind: 'EM_ABERTO', label: 'EVENTO' },
  })

  const [membros, times] = await Promise.all([
    prisma.member.count(),
    prisma.team.count(),
  ])

  const vagas = Object.values(DEFAULT_FORMATION).reduce((a, b) => a + b, 0)
  console.log(
    `Seed concluido: ${membros} integrantes, ${times} times, ${vagas} vagas por culto.`,
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
