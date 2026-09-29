'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { roleSchema } from '@/lib/domain/types'

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')
const countSchema = z.number().int().min(0).max(6)

function revalidate() {
  revalidatePath('/times')
  revalidatePath('/')
}

export async function updateTeamAction(
  id: string,
  data: { name?: string; color?: string; active?: boolean },
) {
  await prisma.team.update({
    where: { id },
    data: {
      ...(data.name !== undefined
        ? { name: z.string().trim().min(1).max(30).parse(data.name) }
        : {}),
      ...(data.color !== undefined ? { color: colorSchema.parse(data.color) } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  })

  revalidate()
}

export async function createTeamAction() {
  const last = await prisma.team.findFirst({ orderBy: { order: 'desc' } })
  const order = (last?.order ?? -1) + 1

  await prisma.team.create({
    data: { name: `TIME ${order + 1}`, color: '#D9D9D9', order },
  })

  revalidate()
}

export async function deleteTeamAction(id: string) {
  const usado = await prisma.scheduleEntry.count({ where: { teamId: id } })

  if (usado > 0) {
    throw new Error('Este time já aparece em escalas salvas. Desative em vez de excluir.')
  }

  await prisma.team.delete({ where: { id } })
  revalidate()
}

/** Muda quantas pessoas uma posição leva em cada culto. */
export async function setFormationAction(role: string, count: number) {
  const parsedRole = roleSchema.parse(role)
  const parsedCount = countSchema.parse(count)

  await prisma.formation.upsert({
    where: { role: parsedRole },
    update: { count: parsedCount },
    create: { role: parsedRole, count: parsedCount },
  })

  revalidate()
}
