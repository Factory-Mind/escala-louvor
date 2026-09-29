import type { ServiceDay } from './serviceDays'

/** O minimo que a rotacao precisa saber sobre um time. */
export type RotationTeam = {
  id: string
  name: string
  color: string
  order: number
}

export type ScheduledDay = ServiceDay & { team: RotationTeam }

const MS_POR_DIA = 86_400_000

/**
 * Numero da semana contado desde 01/01/1970, virando sempre no domingo.
 *
 * 01/01/1970 caiu numa quinta, entao o `+ 4` empurra a virada para o domingo.
 * Como o indice sai da propria data, o rodizio se encadeia sozinho de um mes
 * para o outro — nao existe cursor guardado nem dependencia do mes anterior.
 */
export function weekIndex(date: Date): number {
  return Math.floor((Math.floor(date.getTime() / MS_POR_DIA) + 4) / 7)
}

const ANCHOR_WEEK = weekIndex(new Date(Date.UTC(2026, 7, 2)))

const FOUR_TEAM_SEQUENCE = [0, 2, 1, 3]

function sequenceFor(size: number): number[] {
  if (size === FOUR_TEAM_SEQUENCE.length) return FOUR_TEAM_SEQUENCE
  return Array.from({ length: size }, (_, index) => index)
}

export function assignTeams(days: ServiceDay[], teams: RotationTeam[]): ScheduledDay[] {
  if (teams.length === 0) {
    throw new Error('Nao ha nenhum time ativo para montar a escala.')
  }

  const ordered = [...teams].sort((a, b) => a.order - b.order)
  const sequence = sequenceFor(ordered.length)
  const offset = Math.floor(ordered.length / 2)

  return days.map((day) => {
    const slot = weekIndex(day.date) - ANCHOR_WEEK + (day.services.includes('QUARTA') ? offset : 0)
    const position = ((slot % sequence.length) + sequence.length) % sequence.length

    return { ...day, team: ordered[sequence[position]] }
  })
}
