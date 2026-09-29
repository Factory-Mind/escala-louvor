import 'server-only'
import {
  DEFAULT_FORMATION,
  isExceptionKind,
  isRole,
  isServiceKind,
  type ExceptionKind,
  type Role,
} from '@/lib/domain/types'
import { prisma } from '@/lib/db'
import type {
  DayException,
  Formation,
  GeneratedAssignment,
  GeneratedEntry,
  GeneratorMember,
} from '@/lib/scheduler/generate'
import { unavailableKey } from '@/lib/scheduler/generate'
import type { RotationTeam } from '@/lib/scheduler/rotation'

/** Primeiro instante do mes, em UTC. */
export function monthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1))
}

/** Primeiro instante do mes seguinte, em UTC. */
export function monthEnd(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1))
}

export async function loadMembers(): Promise<GeneratorMember[]> {
  const rows = await prisma.member.findMany({
    include: { roles: true },
    orderBy: { name: 'asc' },
  })

  return rows.map((member) => ({
    id: member.id,
    name: member.name,
    isGestor: member.isGestor,
    isMinistro: member.isMinistro,
    active: member.active,
    roles: member.roles.map((r) => r.role).filter(isRole),
  }))
}

/** Times ativos, na ordem do rodizio de cores. */
export async function loadTeams(): Promise<RotationTeam[]> {
  const rows = await prisma.team.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  })

  return rows.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    order: team.order,
  }))
}

/** Quantas pessoas cada posicao leva. Posicoes sem registro caem no padrao. */
export async function loadFormation(): Promise<Formation> {
  const rows = await prisma.formation.findMany()
  const formation = { ...DEFAULT_FORMATION }

  for (const row of rows) {
    if (isRole(row.role)) formation[row.role] = row.count
  }

  return formation
}

/** Indisponibilidades do mes, no formato que o gerador espera. */
export async function loadUnavailable(year: number, month: number): Promise<Set<string>> {
  const rows = await prisma.unavailability.findMany({
    where: { date: { gte: monthStart(year, month), lt: monthEnd(year, month) } },
  })

  return new Set(rows.map((row) => unavailableKey(row.memberId, row.date)))
}

export type StoredException = {
  id: string
  date: Date
  kind: ExceptionKind
  label: string | null
}

export async function listExceptions(year: number, month: number): Promise<StoredException[]> {
  const rows = await prisma.serviceException.findMany({
    where: { date: { gte: monthStart(year, month), lt: monthEnd(year, month) } },
    orderBy: { date: 'asc' },
  })

  return rows
    .filter((row) => isExceptionKind(row.kind))
    .map((row) => ({
      id: row.id,
      date: row.date,
      kind: row.kind as ExceptionKind,
      label: row.label,
    }))
}

export async function loadExceptions(
  year: number,
  month: number,
): Promise<Map<string, DayException>> {
  const rows = await listExceptions(year, month)
  return new Map(
    rows.map((row) => [row.date.toISOString().slice(0, 10), { kind: row.kind, label: row.label }]),
  )
}

export async function loadPreviousMonthEntries(
  year: number,
  month: number,
): Promise<StoredEntry[]> {
  const previous = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
  const schedule = await loadSchedule(previous.year, previous.month)
  return schedule?.entries ?? []
}

/** Igual ao que o gerador produz, mas carregando os ids do banco — a tela
 *  precisa deles para saber qual celula esta sendo editada. */
export type StoredAssignment = GeneratedAssignment & { id: string }

export type StoredEntry = Omit<GeneratedEntry, 'assignments'> & {
  id: string
  assignments: StoredAssignment[]
}

export type StoredSchedule = {
  id: string
  year: number
  month: number
  seed: string
  entries: StoredEntry[]
}

/** Converte a escala salva de volta para o formato do gerador. */
export async function loadSchedule(
  year: number,
  month: number,
): Promise<StoredSchedule | null> {
  const schedule = await prisma.schedule.findUnique({
    where: { year_month: { year, month } },
    include: {
      entries: {
        orderBy: { order: 'asc' },
        include: { assignments: true },
      },
    },
  })

  if (!schedule) return null

  return {
    id: schedule.id,
    year: schedule.year,
    month: schedule.month,
    seed: schedule.seed,
    entries: schedule.entries
      .filter((entry) => isServiceKind(entry.service))
      .map((entry) => ({
        id: entry.id,
        order: entry.order,
        date: entry.date,
        service: entry.service as GeneratedEntry['service'],
        teamId: entry.teamId,
        locked: entry.locked,
        exception:
          entry.exceptionKind && isExceptionKind(entry.exceptionKind)
            ? { kind: entry.exceptionKind, label: entry.exceptionLabel }
            : null,
        assignments: entry.assignments
          .filter((a) => isRole(a.role))
          .sort((a, b) => a.position - b.position)
          .map((a) => ({
            id: a.id,
            role: a.role as Role,
            position: a.position,
            memberId: a.memberId,
            isGestor: a.isGestor,
            locked: a.locked,
          })),
      })),
  }
}
