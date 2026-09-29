'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { exceptionKindSchema } from '@/lib/domain/types'

const exceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kind: exceptionKindSchema,
  label: z.string().trim().max(40).nullable(),
})

export async function saveExceptionAction(date: string, kind: string, label: string | null) {
  const input = exceptionSchema.parse({ date, kind, label: label?.trim() || null })
  const day = new Date(`${input.date}T00:00:00.000Z`)

  await prisma.serviceException.upsert({
    where: { date: day },
    update: { kind: input.kind, label: input.label },
    create: { date: day, kind: input.kind, label: input.label },
  })

  revalidatePath('/')
}

export async function deleteExceptionAction(id: string) {
  await prisma.serviceException.delete({ where: { id } })
  revalidatePath('/')
}
