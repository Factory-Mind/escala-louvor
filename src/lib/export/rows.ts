import {
  A_DEFINIR,
  COLUMNS,
  GESTOR_SUFFIX,
  ROLES,
  SERVICE_LABELS,
  type ColumnKey,
} from '@/lib/domain/types'
import type { GeneratedEntry } from '@/lib/scheduler/generate'
import { formatDate } from '@/lib/scheduler/serviceDays'

export { COLUMNS }

/** Cabecalho completo, incluindo a coluna lateral do time. */
export const HEADERS = ['DATA', 'DIA', ...COLUMNS.map((c) => c.label), 'TIME']

export type ExportRow = {
  date: string
  day: string
  cells: Record<ColumnKey, string>
  teamName: string
  teamColor: string
}

export type ExportSchedule = {
  year: number
  month: number
  fileName: string
  rows: ExportRow[]
}

type BuildArgs = {
  year: number
  month: number
  entries: GeneratedEntry[]
  members: Array<{ id: string; name: string }>
  teams: Array<{ id: string; name: string; color: string }>
}

/**
 * Traduz a escala gerada para o formato tabular da planilha: um texto por
 * celula, com os nomes separados por barra e o sufixo /GESTOR no responsavel.
 */
export function buildExportSchedule({
  year,
  month,
  entries,
  members,
  teams,
}: BuildArgs): ExportSchedule {
  const nameById = new Map(members.map((m) => [m.id, m.name]))
  const teamById = new Map(teams.map((t) => [t.id, t]))

  const rows = [...entries]
    .sort((a, b) => a.order - b.order)
    .map((entry) => {
      const team = entry.teamId ? teamById.get(entry.teamId) : undefined

      const cells = Object.fromEntries(
        COLUMNS.map((column) => {
          const roles: readonly string[] = column.roles
          const names = entry.assignments
            .filter((a) => roles.includes(a.role))
            .sort(
              (a, b) =>
                ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.position - b.position,
            )
            .map((a) => {
              if (!a.memberId) return A_DEFINIR
              const name = nameById.get(a.memberId) ?? A_DEFINIR
              return a.isGestor ? `${name}/${GESTOR_SUFFIX}` : name
            })

          return [column.key, names.join('/')]
        }),
      ) as Record<ColumnKey, string>

      return {
        date: formatDate(entry.date),
        day: SERVICE_LABELS[entry.service],
        cells,
        teamName: team?.name ?? '',
        teamColor: team?.color ?? '#FFFFFF',
      }
    })

  return {
    year,
    month,
    fileName: `escala-louvor-${year}-${String(month).padStart(2, '0')}`,
    rows,
  }
}

/** Valores de uma linha na ordem das colunas. */
export function rowValues(row: ExportRow): string[] {
  return [row.date, row.day, ...COLUMNS.map((c) => row.cells[c.key]), row.teamName]
}
