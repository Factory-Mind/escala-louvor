'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { roleSchema } from '@/lib/domain/types'
import { generateSchedule, type GeneratedEntry } from '@/lib/scheduler/generate'
import { randomSeed } from '@/lib/scheduler/rng'
import { recordEvent } from '@/server/events'
import {
  loadExceptions,
  loadFormation,
  loadMembers,
  loadPreviousMonthEntries,
  loadSchedule,
  loadTeams,
  loadUnavailable,
} from '@/server/queries'

const monthSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
})

export type GenerateResult = {
  warnings: Array<{ date: string; day: string; message: string }>
}

/**
 * Monta a escala do mes e substitui a versao salva. Linhas e celulas que o
 * lider tiver travado sao preservadas.
 */
export async function generateScheduleAction(
  year: number,
  month: number,
): Promise<GenerateResult> {
  const input = monthSchema.parse({ year, month })

  const [teams, formation, members, unavailable, stored, exceptions, history] = await Promise.all([
    loadTeams(),
    loadFormation(),
    loadMembers(),
    loadUnavailable(input.year, input.month),
    loadSchedule(input.year, input.month),
    loadExceptions(input.year, input.month),
    loadPreviousMonthEntries(input.year, input.month),
  ])

  if (teams.length === 0) {
    throw new Error('Cadastre pelo menos um time antes de gerar a escala.')
  }

  if (members.filter((m) => m.active).length === 0) {
    throw new Error('Cadastre os integrantes antes de gerar a escala.')
  }

  const seed = randomSeed()

  const { entries, warnings } = generateSchedule({
    year: input.year,
    month: input.month,
    teams,
    formation,
    members,
    unavailable,
    seed,
    previous: stored?.entries,
    history,
    exceptions,
  })

  await persist(input.year, input.month, seed, entries)
  await recordEvent('SCHEDULE_GENERATED', input)
  revalidatePath('/')

  return {
    warnings: warnings.map((w) => ({
      date: w.date.toISOString().slice(0, 10),
      day: w.service,
      message: w.message,
    })),
  }
}

async function persist(
  year: number,
  month: number,
  seed: string,
  entries: GeneratedEntry[],
) {
  await prisma.$transaction(async (tx) => {
    // O cascade do schema limpa entries e assignments junto.
    await tx.schedule.deleteMany({ where: { year, month } })

    await tx.schedule.create({
      data: {
        year,
        month,
        seed,
        entries: {
          create: entries.map((entry) => ({
            date: entry.date,
            service: entry.service,
            teamId: entry.teamId,
            exceptionKind: entry.exception?.kind ?? null,
            exceptionLabel: entry.exception?.label ?? null,
            locked: entry.locked,
            order: entry.order,
            assignments: {
              create: entry.assignments.map((a) => ({
                role: a.role,
                position: a.position,
                memberId: a.memberId,
                isGestor: a.isGestor,
                locked: a.locked,
              })),
            },
          })),
        },
      },
    })
  })
}

/** Troca a pessoa de uma celula. `null` deixa a celula como A DEFINIR. */
export async function setAssignmentMemberAction(assignmentId: string, memberId: string | null) {
  await prisma.scheduleAssignment.update({
    where: { id: assignmentId },
    // Uma escolha manual ja vale como trava: regerar nao deve desfazer.
    data: { memberId, locked: true, ...(memberId ? {} : { isGestor: false }) },
  })

  revalidatePath('/')
}

export async function removeAssignmentAction(assignmentId: string) {
  await prisma.scheduleAssignment.delete({ where: { id: assignmentId } })

  revalidatePath('/')
}

export async function addAssignmentAction(entryId: string, role: string, memberId: string) {
  const parsedRole = roleSchema.parse(role)

  await prisma.$transaction(async (tx) => {
    const last = await tx.scheduleAssignment.findFirst({
      where: { entryId, role: parsedRole },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    await tx.scheduleAssignment.create({
      data: {
        entryId,
        role: parsedRole,
        position: (last?.position ?? -1) + 1,
        memberId,
        locked: true,
      },
    })
  })

  revalidatePath('/')
}

/** Trava ou destrava uma celula. */
export async function toggleAssignmentLockAction(assignmentId: string) {
  const current = await prisma.scheduleAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
    select: { locked: true },
  })

  await prisma.scheduleAssignment.update({
    where: { id: assignmentId },
    data: { locked: !current.locked },
  })

  revalidatePath('/')
}

/** Trava ou destrava a linha inteira. */
export async function toggleEntryLockAction(entryId: string) {
  const current = await prisma.scheduleEntry.findUniqueOrThrow({
    where: { id: entryId },
    select: { locked: true },
  })

  await prisma.scheduleEntry.update({
    where: { id: entryId },
    data: { locked: !current.locked },
  })

  revalidatePath('/')
}

/** Move a marca de gestor para outra pessoa da mesma linha. */
export async function setEntryGestorAction(entryId: string, assignmentId: string) {
  await prisma.$transaction([
    prisma.scheduleAssignment.updateMany({
      where: { entryId },
      data: { isGestor: false },
    }),
    prisma.scheduleAssignment.update({
      where: { id: assignmentId },
      data: { isGestor: true },
    }),
  ])

  revalidatePath('/')
}

/** Apaga a escala do mes inteira, incluindo as travas. */
export async function deleteScheduleAction(year: number, month: number) {
  const input = monthSchema.parse({ year, month })

  await prisma.schedule.deleteMany({ where: { year: input.year, month: input.month } })

  revalidatePath('/')
}
