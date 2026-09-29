import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/generated/prisma/client'

/**
 * Prisma 7 exige um driver adapter. Em dev o Next recarrega os modulos a cada
 * edicao, entao guardamos a instancia no globalThis para nao abrir uma conexao
 * nova (e um file handle novo do SQLite) a cada hot reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
