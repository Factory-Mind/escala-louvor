'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')

/**
 * Marca ou desmarca que alguem nao pode num dia de culto.
 * A data e gravada a meia-noite UTC para nao escorregar de fuso.
 */
export async function toggleUnavailabilityAction(
  memberId: string,
  date: string,
  unavailable: boolean,
) {
  const parsed = new Date(`${isoDate.parse(date)}T00:00:00.000Z`)

  if (unavailable) {
    await prisma.unavailability.upsert({
      where: { memberId_date: { memberId, date: parsed } },
      update: {},
      create: { memberId, date: parsed },
    })
  } else {
    await prisma.unavailability.deleteMany({ where: { memberId, date: parsed } })
  }

  revalidatePath('/disponibilidade')
  revalidatePath('/')
}
