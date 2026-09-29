import Link from 'next/link'
import { CalendarDays, Download, Table2, TriangleAlert } from 'lucide-react'
import {
  COLUMNS,
  ROLES,
  SERVICE_LABELS,
  type Role,
} from '@/lib/domain/types'
import { buttonVariants } from '@/components/ui/button'
import { DeleteScheduleButton } from '@/components/delete-schedule-button'
import { GenerateButton } from '@/components/generate-button'
import { MonthPicker } from '@/components/month-picker'
import { monthLabel } from '@/lib/domain/months'
import { PageBar } from '@/components/page-bar'
import { ScheduleTable, type TableRow } from '@/components/schedule-table'
import { HEADERS } from '@/lib/export/rows'
import { formatDate, dateKey } from '@/lib/scheduler/serviceDays'
import { ExceptionsPanel } from '@/components/exceptions-panel'
import { buildServiceDays } from '@/lib/scheduler/serviceDays'
import {
  listExceptions,
  loadMembers,
  loadSchedule,
  loadTeams,
  loadUnavailable,
} from '@/server/queries'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function currentMonth() {
  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const fallback = currentMonth()
  const year = Number(params.year) || fallback.year
  const month = Number(params.month) || fallback.month

  const [stored, teams, members, unavailable, exceptions] = await Promise.all([
    loadSchedule(year, month),
    loadTeams(),
    loadMembers(),
    loadUnavailable(year, month),
    listExceptions(year, month),
  ])

  const nameById = new Map(members.map((m) => [m.id, m.name]))
  const teamById = new Map(teams.map((t) => [t.id, t]))

  const roster = Object.fromEntries(
    ROLES.map((role) => [
      role,
      members
        .filter((m) => m.active && m.roles.includes(role))
        .map((m) => ({ id: m.id, name: m.name })),
    ]),
  ) as Record<Role, Array<{ id: string; name: string }>>

  const rows: TableRow[] = (stored?.entries ?? []).map((entry) => {
    const team = entry.teamId ? teamById.get(entry.teamId) : undefined

    return {
      entryId: entry.id,
      date: formatDate(entry.date),
      dateKey: dateKey(entry.date),
      day: SERVICE_LABELS[entry.service],
      teamName: team?.name ?? '',
      teamColor: team?.color ?? '#FFFFFF',
      locked: entry.locked,
      exception: !!entry.exception,
      cells: COLUMNS.map((column) => ({
        key: column.key,
        roles: [...column.roles],
        items: column.roles.flatMap((role) =>
          entry.assignments
            .filter((a) => a.role === role)
            .map((a) => ({
              role,
              assignmentId: a.id,
              memberId: a.memberId,
              name: a.memberId ? (nameById.get(a.memberId) ?? '') : '',
              isGestor: a.isGestor,
              locked: a.locked,
            })),
        ),
      })),
    }
  })

  const vagas = rows.reduce(
    (total, row) =>
      total + row.cells.flatMap((c) => c.items).filter((i) => !i.memberId).length,
    0,
  )
  const semGestor = rows.filter(
    (row) => !row.exception && !row.cells.some((c) => c.items.some((i) => i.isGestor)),
  ).length
  const temEscala = rows.length > 0

  const exportHref = `/api/export?year=${year}&month=${month}&format=xlsx`

  return (
    <div>
      <PageBar icon={CalendarDays} title="Escala">
        <MonthPicker year={year} month={month} />

        <span className="hidden h-6 w-px bg-border sm:block" />

        <GenerateButton year={year} month={month} hasSchedule={temEscala} />

        {temEscala && (
          <>
            <a href={exportHref} className={cn(buttonVariants({ variant: 'outline' }))}>
              <Download />
              Baixar .xlsx
            </a>
            <DeleteScheduleButton
              year={year}
              month={month}
              label={monthLabel(year, month)}
            />
          </>
        )}
      </PageBar>

      {temEscala && (
        <div className="mb-6 grid gap-2.5 rounded-2xl bg-tray p-2.5 sm:grid-cols-3">
          <Stat label="Cultos no mês" value={rows.length} />
          <Stat label="Times no rodízio" value={new Set(rows.map((r) => r.teamName)).size} />
          <Stat
            label="Vagas em aberto"
            value={vagas}
            hint={semGestor > 0 ? `${semGestor} sem gestor` : undefined}
            alerta={vagas > 0 || semGestor > 0}
          />
        </div>
      )}

      {(vagas > 0 || semGestor > 0) && (
        <p className="mb-6 flex items-start gap-2.5 rounded-xl bg-destructive/8 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            {vagas > 0 && (
              <>
                {vagas} {vagas === 1 ? 'vaga ficou' : 'vagas ficaram'} em aberto
                {semGestor > 0 && ' · '}
              </>
            )}
            {semGestor > 0 && (
              <>
                {semGestor} {semGestor === 1 ? 'culto está' : 'cultos estão'} sem gestor
              </>
            )}
            . Clique na célula para escolher alguém.
          </span>
        </p>
      )}

      <ExceptionsPanel
        exceptions={exceptions.map((e) => ({
          id: e.id,
          dateKey: dateKey(e.date),
          date: formatDate(e.date),
          kind: e.kind,
          label: e.label,
        }))}
        days={buildServiceDays(year, month).map((d) => ({
          dateKey: dateKey(d.date),
          label: `${formatDate(d.date)} - ${d.services.length > 1 ? 'DOMINGO' : 'QUARTA'}`,
        }))}
      />

      <section className="rounded-2xl border border-border">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
          <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
            <Table2 className="size-[18px] text-faint" />
            Escala de {monthLabel(year, month)}
          </h2>

          <p className="text-xs text-faint">
            Preview da planilha — o .xlsx sai com estas cores e estas colunas.
          </p>
        </header>

        <div className="border-t border-border px-4 py-4 sm:px-5 sm:py-5">
          {temEscala ? (
            /* A tabela e o preview fiel do .xlsx: bordas pretas, cabecalho lilas e
               o fundo de cada linha na cor do time. O visual dela nao muda — o que
               sai aqui precisa sair igual na planilha baixada. */
            <ScheduleTable
              headers={HEADERS}
              rows={rows}
              roster={roster}
              unavailable={[...unavailable]}
            />
          ) : (
            <div className="max-w-md py-6">
              <p className="text-sm">
                Ainda não existe escala para {monthLabel(year, month)}.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {teams.length === 0 ? (
                  <>
                    Antes disso,{' '}
                    <Link href="/times" className="underline underline-offset-4">
                      monte os times
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Vale conferir a{' '}
                    <Link href="/disponibilidade" className="underline underline-offset-4">
                      disponibilidade do mês
                    </Link>{' '}
                    antes de gerar.
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  alerta,
}: {
  label: string
  value: number
  hint?: string
  alerta?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          'display tabular mt-1 text-[28px]',
          alerta ? 'text-destructive' : 'text-foreground',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-destructive">{hint}</p>}
    </div>
  )
}
