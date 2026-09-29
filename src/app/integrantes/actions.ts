'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { roleSchema } from '@/lib/domain/types'

const nameSchema = z.string().trim().min(1, 'Informe o nome.').max(40)

export async function createMemberAction(name: string) {
  const parsed = nameSchema.parse(name).toUpperCase()

  const existing = await prisma.member.findUnique({ where: { name: parsed } })
  if (existing) throw new Error(`${parsed} já está cadastrado.`)

  await prisma.member.create({ data: { name: parsed } })
  revalidatePath('/integrantes')
}

export async function renameMemberAction(id: string, name: string) {
  await prisma.member.update({
    where: { id },
    data: { name: nameSchema.parse(name).toUpperCase() },
  })
  revalidatePath('/integrantes')
}

export async function setMemberFlagAction(
  id: string,
  flag: 'active' | 'isGestor' | 'isMinistro',
  value: boolean,
) {
  await prisma.member.update({ where: { id }, data: { [flag]: value } })
  revalidatePath('/integrantes')
  revalidatePath('/')
}

/** Liga ou desliga um instrumento para o integrante. */
export async function toggleMemberRoleAction(id: string, role: string, enabled: boolean) {
  const parsed = roleSchema.parse(role)

  if (enabled) {
    await prisma.memberRole.upsert({
      where: { memberId_role: { memberId: id, role: parsed } },
      update: {},
      create: { memberId: id, role: parsed },
    })
  } else {
    await prisma.memberRole.deleteMany({ where: { memberId: id, role: parsed } })
  }

  revalidatePath('/integrantes')
  revalidatePath('/')
}

export async function deleteMemberAction(id: string) {
  const escalado = await prisma.scheduleAssignment.count({ where: { memberId: id } })

  if (escalado > 0) {
    throw new Error(
      'Esta pessoa já aparece em escalas salvas. Desative em vez de excluir.',
    )
  }

  await prisma.member.delete({ where: { id } })
  revalidatePath('/integrantes')
}
