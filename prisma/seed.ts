import { config } from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import type { ExceptionKind, Role } from '../src/lib/domain/types'
import { withVerifyFull } from '../src/lib/connectionString'

config({ path: '.env.local', quiet: true })
config({ quiet: true })

type MemberSeed = {
  name: string
  roles: Role[]
  isGestor?: boolean
  isMinistro?: boolean
  active?: boolean
}

const MEMBERS: MemberSeed[] = [
  { name: 'CADU', roles: ['VOCAL_MASC'] },
  { name: 'ELDES', roles: ['VOCAL_MASC'], isMinistro: true },
  { name: 'ELIEZER', roles: ['VOCAL_MASC'], isMinistro: true },
  { name: 'GABRIEL', roles: ['VOCAL_MASC'], active: false },
  { name: 'KALEB', roles: ['VOCAL_MASC'], isMinistro: true },
  { name: 'AMANDA', roles: ['VOCAL_FEM'] },
  { name: 'ANNY', roles: ['VOCAL_FEM'], isMinistro: true },
  { name: 'BRUNA', roles: ['VOCAL_FEM'], isMinistro: true },
  { name: 'FLOR', roles: ['VOCAL_FEM'] },
  { name: 'GI', roles: ['VOCAL_FEM'], isMinistro: true },
  { name: 'JULIANA', roles: ['VOCAL_FEM'], isMinistro: true },
  { name: 'LARISSA', roles: ['VOCAL_FEM'] },
  { name: 'MANU', roles: ['VOCAL_FEM'] },
  { name: 'REBECA', roles: ['VOCAL_FEM'], isMinistro: true },
  { name: 'SUELLEN', roles: ['VOCAL_FEM'] },
  { name: 'AMORAS', roles: ['TECLADO'], isGestor: true },
  { name: 'DIGO', roles: ['TECLADO'], isGestor: true },
  { name: 'KAJU', roles: ['TECLADO'], isGestor: true },
  { name: 'DALLA', roles: ['BAIXO'], active: false },
  { name: 'HENRY', roles: ['BAIXO'] },
  { name: 'LEANDRO', roles: ['BAIXO', 'SOM'] },
  { name: 'LUCAS', roles: ['BAIXO'] },
  { name: 'RUD', roles: ['BAIXO', 'SOM'] },
  { name: 'BRENO', roles: ['GUITARRA'] },
  { name: 'JOÃO', roles: ['GUITARRA'], isGestor: true },
  { name: 'WILLIAN', roles: ['GUITARRA'], isGestor: true },
  { name: 'KADU', roles: ['BATERIA'] },
  { name: 'RAPHA', roles: ['BATERIA'] },
  { name: 'JORGE', roles: ['SOM'] },
  { name: 'PEDRO', roles: ['SOM'] },
  { name: 'GIGI', roles: ['PROJECAO'] },
  { name: 'GUI', roles: ['PROJECAO'] },
  { name: 'JACKSON', roles: ['PROJECAO'] },
  { name: 'JUNIOR', roles: ['PROJECAO'] },
  { name: 'NESSAH', roles: ['PROJECAO'] },
  { name: 'YASMIM', roles: ['PROJECAO'] },
]

type TeamSeed = { name: string; color: string; order: number }

const TEAMS: TeamSeed[] = [
  { name: 'TIME 1', color: '#ED7D31', order: 0 },
  { name: 'TIME 2', color: '#FFFF00', order: 1 },
  { name: 'TIME 3', color: '#66EE77', order: 2 },
  { name: 'TIME 4', color: '#3DA5F4', order: 3 },
]

const FORMATION: Record<Role, number> = {
  VOCAL_MASC: 1,
  VOCAL_FEM: 3,
  TECLADO: 1,
  BAIXO: 1,
  GUITARRA: 1,
  BATERIA: 1,
  SOM: 1,
  PROJECAO: 1,
}

type ExceptionSeed = { date: string; kind: ExceptionKind; label: string }

const EXCEPTIONS: ExceptionSeed[] = [
  { date: '2026-10-18', kind: 'EM_ABERTO', label: 'Retiro do Pulse' },
]

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!connectionString) throw new Error('DATABASE_URL nao configurada.')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: withVerifyFull(connectionString) }) })

async function main() {
  for (const spec of MEMBERS) {
    const data = {
      isGestor: spec.isGestor ?? false,
      isMinistro: spec.isMinistro ?? false,
      active: spec.active ?? true,
    }

    const member = await prisma.member.upsert({
      where: { name: spec.name },
      update: data,
      create: { name: spec.name, ...data },
    })

    await prisma.memberRole.deleteMany({ where: { memberId: member.id } })
    await prisma.memberRole.createMany({
      data: spec.roles.map((role) => ({ memberId: member.id, role })),
    })
  }

  for (const spec of TEAMS) {
    await prisma.team.upsert({
      where: { name: spec.name },
      update: { color: spec.color, order: spec.order, active: true },
      create: { name: spec.name, color: spec.color, order: spec.order },
    })
  }

  for (const [role, count] of Object.entries(FORMATION)) {
    await prisma.formation.upsert({
      where: { role },
      update: { count },
      create: { role, count },
    })
  }

  for (const spec of EXCEPTIONS) {
    const date = new Date(`${spec.date}T00:00:00.000Z`)
    await prisma.serviceException.upsert({
      where: { date },
      update: { kind: spec.kind, label: spec.label },
      create: { date, kind: spec.kind, label: spec.label },
    })
  }

  const [membros, times, excecoes] = await Promise.all([
    prisma.member.count(),
    prisma.team.count(),
    prisma.serviceException.count(),
  ])

  console.log(`Seed concluido: ${membros} integrantes, ${times} times, ${excecoes} dia(s) em aberto.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
