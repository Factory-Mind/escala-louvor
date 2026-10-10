import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import {
  COLUMNS,
  EXCEPTION_KIND_OPTIONS,
  ROLES,
  type Role,
  type ServiceKind,
} from '@/lib/domain/types'
import { DownloadButton } from '@/components/download-button'
import { DeleteScheduleButton } from '@/components/delete-schedule-button'
import { GenerateButton } from '@/components/generate-button'
import { MonthPicker } from '@/components/month-picker'
import { monthLabel } from '@/lib/domain/months'
import { PageHeader } from '@/components/page-header'
import { ScheduleTable, type TableRow } from '@/components/schedule-table'
import { TeamDot } from '@/components/team-chip'
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

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

const SLOT_LABELS: Record<ServiceKind, string> = {
  DOM_MANHA: 'Manhã',
  DOM_NOITE: 'Noite',
  QUARTA: 'Culto de quarta',
}

const COLUMN_LABELS: Record<(typeof COLUMNS)[number]['key'], string> = {
  VOCAL_MASC: 'Vocais masc',
  VOCAL_FEM: 'Vocais fem',
  TECLADO: 'Teclado',
  BAIXO: 'Baixo',
  GUITARRA: 'Guitarra',
  BATERIA: 'Bateria',
  SOM_PROJECAO: 'Som / Projeção',
}

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
      dateKey: dateKey(entry.date),
      weekday: WEEKDAYS[entry.date.getUTCDay()],
      dayOfMonth: String(entry.date.getUTCDate()).padStart(2, '0'),
      slot: SLOT_LABELS[entry.service],
      teamName: team?.name ?? '',
      teamColor: team?.color ?? '#FFFFFF',
      locked: entry.locked,
      exception: entry.exception
        ? {
            kind: EXCEPTION_KIND_OPTIONS[entry.exception.kind],
            label: entry.exception.label?.trim() || null,
          }
        : null,
      cells: COLUMNS.map((column) => ({
        key: column.key,
        label: COLUMN_LABELS[column.key],
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

  const abertas = rows.flatMap((row) =>
    row.cells.flatMap((c) => c.items).filter((i) => !i.memberId),
  )
  const vagas = abertas.length
  const semGestor = rows.filter(
    (row) => !row.exception && !row.cells.some((c) => c.items.some((i) => i.isGestor)),
  ).length
  const temEscala = rows.length > 0
  const legenda = [
    ...new Map(rows.filter((r) => r.teamName).map((r) => [r.teamName, r.teamColor])),
  ].map(([name, color]) => ({ name, color }))

  const exceptionsPanel = (
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
  )

  return (
    <>
      <PageHeader
        eyebrow="Escala"
        title={<MonthPicker year={year} month={month} />}
        actions={
          <>
            {temEscala && (
              <DeleteScheduleButton year={year} month={month} label={monthLabel(year, month)} />
            )}
            {temEscala && <DownloadButton year={year} month={month} />}
            <GenerateButton year={year} month={month} hasSchedule={temEscala} />
          </>
        }
      >
        {temEscala && (
          <section
            aria-label="Resumo do mês"
            className="grid grid-cols-3 gap-2 md:mt-2 md:grid-cols-4 md:gap-3"
          >
            <Stat label="Cultos no mês" short="Cultos" value={rows.length} />
            <Stat label="Times no rodízio" short="Times" value={legenda.length} />
            <Stat
              label="Dias especiais"
              short="Especiais"
              value={exceptions.length}
              className="hidden md:flex"
            />
            <Stat
              label="Vagas em aberto"
              short="Em aberto"
              value={vagas}
              alerta={vagas > 0}
              linkVaga={vagas > 0}
            />
          </section>
        )}
      </PageHeader>

      {(vagas > 0 || semGestor > 0) && (
        <p
          role="status"
          className="flex items-start gap-2.5 rounded-tile border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-foreground"
        >
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
            . Toque em Escolher, ou no nome, para definir quem entra.
          </span>
        </p>
      )}

      <section className="rounded-card md:overflow-hidden md:border md:border-border md:bg-card">
        <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:flex">
          <h2 className="text-[15px] font-semibold first-letter:uppercase">
            {monthLabel(year, month)}
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            {legenda.length > 0 && (
              <ul className="flex flex-wrap items-center gap-3 text-[13px] text-subtle">
                {legenda.map((team) => (
                  <li key={team.name} className="flex items-center gap-1.5">
                    <TeamDot color={team.color} className="size-2.5 rounded-[3px]" />
                    {team.name}
                  </li>
                ))}
              </ul>
            )}
            {exceptionsPanel}
          </div>
        </div>

        {temEscala ? (
          <ScheduleTable
            columns={COLUMNS.map((c) => ({ key: c.key, label: COLUMN_LABELS[c.key] }))}
            rows={rows}
            roster={roster}
            unavailable={[...unavailable]}
            firstOpenId={abertas[0]?.assignmentId}
          />
        ) : (
          <div className="rounded-card border border-border bg-card px-5 py-8 md:rounded-none md:border-0">
            <p className="text-[15px] font-medium">
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

        {temEscala && (
          <p className="hidden border-t border-divider px-5 py-3.5 text-[13px] text-muted-foreground md:block">
            Clique em um nome para trocar a pessoa. As cores fortes por time continuam no .xlsx
            exportado.
          </p>
        )}
      </section>

      <div className="md:hidden">{exceptionsPanel}</div>
    </>
  )
}

function Stat({
  label,
  short,
  value,
  alerta,
  linkVaga,
  className,
}: {
  label: string
  short: string
  value: number
  alerta?: boolean
  linkVaga?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-0.5 rounded-xl px-3 py-2.5 md:gap-1.5 md:rounded-tile md:border md:px-5 md:py-[18px]',
        alerta
          ? 'bg-danger-soft md:border-danger-border'
          : 'bg-background md:border-border md:bg-card',
        className,
      )}
    >
      <span
        className={cn(
          'text-xs md:text-sm',
          alerta ? 'text-danger-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="md:hidden">{short}</span>
        <span className="hidden md:inline">{label}</span>
      </span>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            'tabular text-xl font-semibold tracking-[-0.02em] md:text-[30px] md:leading-tight',
            alerta && 'text-destructive',
          )}
        >
          {value}
        </span>
        {linkVaga && (
          <>
            <a
              href="#vaga"
              className="hidden text-sm font-medium text-danger-foreground hover:underline md:inline"
            >
              Resolver agora →
            </a>
            <a href="#vaga-m" className="absolute inset-0 rounded-xl md:hidden">
              <span className="sr-only">Ir para a primeira vaga em aberto</span>
            </a>
          </>
        )}
      </div>
    </div>
  )
}
