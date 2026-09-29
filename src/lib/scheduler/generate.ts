import {
  ROLES,
  VOCAL_ROLES,
  type ExceptionKind,
  type Role,
  type ServiceKind,
} from '@/lib/domain/types'
import { createRng, type Rng } from './rng'
import { assignTeams, type RotationTeam } from './rotation'
import { buildServiceDays, dateKey } from './serviceDays'

export type GeneratorMember = {
  id: string
  name: string
  roles: Role[]
  isGestor: boolean
  isMinistro: boolean
  active: boolean
}

/** Quantas pessoas cada posicao leva em cada culto. */
export type Formation = Record<Role, number>

export type GeneratedAssignment = {
  role: Role
  position: number
  /** `null` significa A DEFINIR: ninguem daquele instrumento estava livre. */
  memberId: string | null
  isGestor: boolean
  locked: boolean
}

export type DayException = {
  kind: ExceptionKind
  label: string | null
}

export type GeneratedEntry = {
  order: number
  date: Date
  service: ServiceKind
  teamId: string | null
  locked: boolean
  exception?: DayException | null
  assignments: GeneratedAssignment[]
}

export type GenerationWarning = {
  order: number
  date: Date
  service: ServiceKind
  role?: Role
  message: string
}

export type GenerateInput = {
  year: number
  month: number
  /** Times so definem o rotulo e a cor da linha — nao tem gente fixa. */
  teams: RotationTeam[]
  formation: Formation
  members: GeneratorMember[]
  /** Chaves `memberId:AAAA-MM-DD` — veja `unavailableKey`. */
  unavailable: Set<string>
  seed: string
  /** Escala ja existente do mesmo mes, de onde as travas sao herdadas. */
  previous?: GeneratedEntry[]
  history?: GeneratedEntry[]
  exceptions?: Map<string, DayException>
}

export type GeneratedSchedule = {
  entries: GeneratedEntry[]
  warnings: GenerationWarning[]
}

/** Chave usada no `Set` de indisponibilidades. */
export function unavailableKey(memberId: string, date: Date): string {
  return `${memberId}:${dateKey(date)}`
}

function slotKey(role: Role, position: number) {
  return `${role}:${position}`
}

/**
 * Escolhe o candidato menos escalado ate agora. Empates sao resolvidos pelo
 * RNG semeado — por isso a lista e ordenada por id antes: o consumo do RNG
 * precisa ser deterministico para a mesma seed gerar sempre a mesma escala.
 */
function pickLeastUsed(
  candidates: GeneratorMember[],
  usage: Map<string, number>,
  rng: Rng,
): GeneratorMember | null {
  if (candidates.length === 0) return null

  const scored = [...candidates]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((member) => ({ member, tiebreak: rng() }))

  scored.sort((a, b) => {
    const diff = (usage.get(a.member.id) ?? 0) - (usage.get(b.member.id) ?? 0)
    return diff !== 0 ? diff : a.tiebreak - b.tiebreak
  })

  return scored[0].member
}

type Preferred = Map<string, string>

function lineupToPreferred(lineup: GeneratedAssignment[]): Preferred {
  const map: Preferred = new Map()
  for (const a of lineup) {
    if (a.memberId) map.set(slotKey(a.role, a.position), a.memberId)
  }
  return map
}

function seedPending(history: GeneratedEntry[]): Map<string, Preferred> {
  const daysByTeam = new Map<string, Map<string, GeneratedEntry>>()

  for (const entry of [...history].sort((a, b) => a.order - b.order)) {
    if (!entry.teamId || entry.exception) continue
    const days = daysByTeam.get(entry.teamId) ?? new Map<string, GeneratedEntry>()
    if (!days.has(dateKey(entry.date))) days.set(dateKey(entry.date), entry)
    daysByTeam.set(entry.teamId, days)
  }

  const pending = new Map<string, Preferred>()
  for (const [teamId, days] of daysByTeam) {
    if (days.size % 2 === 0) continue
    const last = [...days.values()].sort((a, b) => a.date.getTime() - b.date.getTime()).pop()!
    pending.set(teamId, lineupToPreferred(last.assignments))
  }

  return pending
}

function bump(counter: Map<string, number>, id: string) {
  counter.set(id, (counter.get(id) ?? 0) + 1)
}

/**
 * Monta a escala do mes inteiro a partir de quem esta disponivel.
 *
 * Nao existe gente fixa por time: para cada dia de culto o app sorteia a
 * formacao entre quem marcou disponivel naquela data, preferindo quem tocou
 * menos no mes. Domingo recebe uma escalacao so, usada de manha e a noite.
 * Tudo que o lider tiver travado na tela e preservado.
 */
export function generateSchedule(input: GenerateInput): GeneratedSchedule {
  const { year, month, teams, formation, members, unavailable, seed } = input

  const rng = createRng(seed)
  const warnings: GenerationWarning[] = []

  const scheduledDays = assignTeams(buildServiceDays(year, month), teams)

  /** Quem toca cada instrumento, so gente ativa. */
  const byRole = new Map<Role, GeneratorMember[]>(ROLES.map((role) => [role, []]))
  for (const member of members) {
    if (!member.active) continue
    for (const role of member.roles) byRole.get(role)?.push(member)
  }

  const memberById = new Map(members.map((member) => [member.id, member]))
  const previousByKey = new Map(
    (input.previous ?? []).map((entry) => [
      `${dateKey(entry.date)}:${entry.service}`,
      entry,
    ]),
  )

  const usage = new Map<string, number>()
  const gestorUsage = new Map<string, number>()
  const teamPending = seedPending(input.history ?? [])

  // Primeira passada: contabiliza o que esta travado, para o balanceamento da
  // segunda passada ja considerar quem o lider fixou na mao.
  for (const day of scheduledDays) {
    const rows = day.services.map((service) =>
      previousByKey.get(`${dateKey(day.date)}:${service}`),
    )
    const travadas = pickLockedLineup(rows)
    if (!travadas) continue

    for (const assignment of travadas.values()) {
      if (!assignment.memberId) continue
      bump(usage, assignment.memberId)
      if (assignment.isGestor) bump(gestorUsage, assignment.memberId)
    }
  }

  const entries: GeneratedEntry[] = []

  for (const day of scheduledDays) {
    const exception = input.exceptions?.get(dateKey(day.date))

    if (exception) {
      for (const service of day.services) {
        entries.push({
          order: entries.length,
          date: day.date,
          service,
          teamId: day.team.id,
          locked: false,
          exception,
          assignments: [],
        })
      }
      continue
    }

    const previousRows = day.services.map((service) =>
      previousByKey.get(`${dateKey(day.date)}:${service}`),
    )

    // Uma linha travada vale para o dia inteiro: se o lider travou a manha, a
    // noite acompanha, senao o domingo se dividiria em duas escalacoes.
    const rowTravada = previousRows.find((row) => row?.locked)

    const lineup = rowTravada
      ? rowTravada.assignments.map((a) => ({ ...a }))
      : drawLineup({
          date: day.date,
          order: entries.length,
          service: day.services[0],
          formation,
          members,
          byRole,
          memberById,
          locked: collectLockedCells(previousRows),
          preferred: teamPending.get(day.team.id),
          unavailable,
          usage,
          gestorUsage,
          rng,
          warnings,
        })

    if (teamPending.has(day.team.id)) {
      teamPending.delete(day.team.id)
    } else {
      teamPending.set(day.team.id, lineupToPreferred(lineup))
    }

    for (const [index, service] of day.services.entries()) {
      entries.push({
        order: entries.length,
        date: day.date,
        service,
        teamId: day.team.id,
        locked: previousRows[index]?.locked ?? false,
        // Cada linha e uma linha do banco: os objetos nao podem ser compartilhados.
        assignments: lineup.map((a) => ({ ...a })),
      })
    }
  }

  return { entries, warnings }
}

/** As celulas travadas do dia, vindas de qualquer um dos cultos daquele dia. */
function collectLockedCells(rows: Array<GeneratedEntry | undefined>) {
  const locked = new Map<string, GeneratedAssignment>()

  for (const row of rows) {
    for (const assignment of row?.assignments ?? []) {
      if (!assignment.locked) continue
      const key = slotKey(assignment.role, assignment.position)
      if (!locked.has(key)) locked.set(key, assignment)
    }
  }

  return locked
}

/** A escalacao de uma linha travada, se houver, indexada por vaga. */
function pickLockedLineup(rows: Array<GeneratedEntry | undefined>) {
  const row = rows.find((r) => r?.locked)
  if (row) {
    return new Map(row.assignments.map((a) => [slotKey(a.role, a.position), a]))
  }

  const cells = collectLockedCells(rows)
  return cells.size > 0 ? cells : null
}

/** Sorteia a formacao do dia entre quem esta disponivel naquela data. */
function drawLineup(args: {
  date: Date
  order: number
  service: ServiceKind
  formation: Formation
  members: GeneratorMember[]
  byRole: Map<Role, GeneratorMember[]>
  memberById: Map<string, GeneratorMember>
  locked: Map<string, GeneratedAssignment>
  preferred?: Preferred
  unavailable: Set<string>
  usage: Map<string, number>
  gestorUsage: Map<string, number>
  rng: Rng
  warnings: GenerationWarning[]
}): GeneratedAssignment[] {
  const { date, order, service, formation, byRole, locked, unavailable } = args
  const { usage, rng, warnings } = args

  const usedToday = new Set<string>()
  const lineup: GeneratedAssignment[] = []

  for (const role of ROLES) {
    const vagas = formation[role] ?? 0

    for (let position = 0; position < vagas; position++) {
      const travada = locked.get(slotKey(role, position))

      if (travada) {
        if (travada.memberId) usedToday.add(travada.memberId)
        lineup.push({ ...travada, isGestor: false })
        continue
      }

      const candidatos = (byRole.get(role) ?? []).filter(
        (m) => !usedToday.has(m.id) && !unavailable.has(unavailableKey(m.id, date)),
      )
      const preferido = args.preferred?.get(slotKey(role, position))
      const escolhido =
        candidatos.find((m) => m.id === preferido) ?? pickLeastUsed(candidatos, usage, rng)

      if (escolhido) usedToday.add(escolhido.id)

      lineup.push({
        role,
        position,
        memberId: escolhido?.id ?? null,
        isGestor: false,
        locked: false,
      })
    }
  }

  for (const [key, travada] of locked) {
    if (lineup.some((a) => slotKey(a.role, a.position) === key)) continue
    if (travada.memberId) usedToday.add(travada.memberId)
    lineup.push({ ...travada, isGestor: false })
  }

  ensureGestor({ ...args, lineup, usedToday })
  ensureMinistros({ ...args, lineup, usedToday, order, service })

  // Os avisos saem depois da troca do gestor, senao uma vaga que acabou de ser
  // preenchida por ele continuaria aparecendo como pendencia.
  for (const vaga of lineup) {
    if (vaga.memberId) continue
    warnings.push({
      order,
      date,
      service,
      role: vaga.role,
      message: `Ninguém disponível para ${vaga.role}.`,
    })
  }

  // As contagens so sobem depois do dia inteiro montado, para nao penalizar
  // quem acabou de entrar na propria linha que esta sendo sorteada.
  for (const id of usedToday) bump(usage, id)

  markGestor({ ...args, lineup })

  return lineup
}

function ensureMinistros(args: {
  formation: Formation
  lineup: GeneratedAssignment[]
  members: GeneratorMember[]
  memberById: Map<string, GeneratorMember>
  usedToday: Set<string>
  date: Date
  order: number
  service: ServiceKind
  preferred?: Preferred
  unavailable: Set<string>
  usage: Map<string, number>
  rng: Rng
  warnings: GenerationWarning[]
}) {
  const { lineup, members, memberById, usedToday, date, order, service } = args
  const { unavailable, usage, rng, warnings, preferred, formation } = args
  const limite = formation.VOCAL_MASC + formation.VOCAL_FEM

  for (const role of VOCAL_ROLES) {
    const escalados = lineup.filter((a) => a.role === role && a.memberId)
    if (escalados.length === 0) continue
    if (escalados.some((a) => memberById.get(a.memberId!)?.isMinistro)) continue

    const ministros = members.filter(
      (m) => m.active && m.isMinistro && m.roles.includes(role),
    )
    if (ministros.length === 0) continue

    const livres = ministros.filter(
      (m) => !usedToday.has(m.id) && !unavailable.has(unavailableKey(m.id, date)),
    )

    const preferidoId = [...(preferred?.entries() ?? [])].find(
      ([key, id]) => key.startsWith(`${role}:`) && livres.some((m) => m.id === id),
    )?.[1]

    const escolhido = livres.find((m) => m.id === preferidoId) ?? pickLeastUsed(livres, usage, rng)

    if (!escolhido) {
      warnings.push({
        order,
        date,
        service,
        role,
        message: `Nenhum ministro disponível para ${role}.`,
      })
      continue
    }

    const position = Math.max(...lineup.filter((a) => a.role === role).map((a) => a.position)) + 1
    const extra: GeneratedAssignment = {
      role,
      position,
      memberId: escolhido.id,
      isGestor: false,
      locked: false,
    }
    lineup.push(extra)
    usedToday.add(escolhido.id)

    const vocais = lineup.filter((a) => a.memberId && VOCAL_ROLES.some((r) => r === a.role))
    if (vocais.length <= limite) continue

    const outro = role === 'VOCAL_MASC' ? 'VOCAL_FEM' : 'VOCAL_MASC'
    const removivel = (alvo: Role, minimo: number) => {
      const doNaipe = lineup.filter((a) => a.role === alvo && a.memberId)
      if (doNaipe.length <= minimo) return null
      return (
        doNaipe
          .filter((a) => !a.locked && a !== extra && !memberById.get(a.memberId!)?.isMinistro)
          .sort((a, b) => b.position - a.position)[0] ?? null
      )
    }

    const vitima = removivel(outro, 1) ?? removivel(role, 1)
    if (!vitima) continue

    lineup.splice(lineup.indexOf(vitima), 1)
    usedToday.delete(vitima.memberId!)
  }
}

/**
 * Todo culto precisa de um responsavel. Como agora tudo e sorteado, pode
 * acontecer de nenhum gestor cair na formacao do dia — neste caso trocamos uma
 * vaga por um gestor que toque aquele instrumento e esteja livre.
 */
function ensureGestor(args: {
  lineup: GeneratedAssignment[]
  members: GeneratorMember[]
  memberById: Map<string, GeneratorMember>
  usedToday: Set<string>
  date: Date
  unavailable: Set<string>
  usage: Map<string, number>
  gestorUsage: Map<string, number>
  rng: Rng
}) {
  const { lineup, members, memberById, usedToday, date, unavailable } = args
  const { usage, gestorUsage, rng } = args

  const jaTem = lineup.some((a) => a.memberId && memberById.get(a.memberId)?.isGestor)
  if (jaTem) return

  const candidatos = members.filter(
    (m) =>
      m.isGestor &&
      m.active &&
      !usedToday.has(m.id) &&
      !unavailable.has(unavailableKey(m.id, date)),
  )

  // Quem foi gestor menos vezes tem a preferencia; empate vai no RNG.
  const ordenados = [...candidatos]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((member) => ({ member, tiebreak: rng() }))
    .sort((a, b) => {
      const diff = (gestorUsage.get(a.member.id) ?? 0) - (gestorUsage.get(b.member.id) ?? 0)
      return diff !== 0 ? diff : a.tiebreak - b.tiebreak
    })
    .map((x) => x.member)

  for (const gestor of ordenados) {
    const vagas = lineup.filter((a) => !a.locked && gestor.roles.includes(a.role))
    if (vagas.length === 0) continue

    // De preferencia ocupa uma vaga vazia; senao, rende quem mais tocou no mes.
    const vaga =
      vagas.find((v) => v.memberId === null) ??
      vagas.sort(
        (a, b) => (usage.get(b.memberId!) ?? 0) - (usage.get(a.memberId!) ?? 0),
      )[0]

    if (vaga.memberId) usedToday.delete(vaga.memberId)
    vaga.memberId = gestor.id
    usedToday.add(gestor.id)
    return
  }
}

/**
 * Marca o responsavel do culto entre quem ja foi escalado no dia, alternando
 * entre os candidatos ao longo do mes. Na exportacao o nome sai como
 * "DIGO/GESTOR".
 */
function markGestor(args: {
  lineup: GeneratedAssignment[]
  memberById: Map<string, GeneratorMember>
  gestorUsage: Map<string, number>
  rng: Rng
  order: number
  date: Date
  service: ServiceKind
  warnings: GenerationWarning[]
}) {
  const { lineup, memberById, gestorUsage, rng, order, date, service, warnings } = args

  // Se o lider travou a celula de alguem que e gestor, respeita a escolha.
  const travado = lineup.find(
    (a) => a.locked && a.memberId && memberById.get(a.memberId)?.isGestor,
  )

  const candidatos = lineup
    .filter((a) => a.memberId && memberById.get(a.memberId)?.isGestor)
    .map((a) => memberById.get(a.memberId!)!)

  if (candidatos.length === 0) {
    warnings.push({
      order,
      date,
      service,
      message: 'Nenhum gestor escalado neste culto.',
    })
    return
  }

  const escolhido = travado
    ? memberById.get(travado.memberId!)!
    : pickLeastUsed(candidatos, gestorUsage, rng)!

  lineup.find((a) => a.memberId === escolhido.id)!.isGestor = true
  bump(gestorUsage, escolhido.id)
}
