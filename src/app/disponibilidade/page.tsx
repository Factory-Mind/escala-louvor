import { ROLES, ROLE_LABELS, type Role } from '@/lib/domain/types'
import { CalendarCheck, CalendarX2 } from 'lucide-react'
import { MonthPicker } from '@/components/month-picker'
import { PageBar } from '@/components/page-bar'
import { monthLabel } from '@/lib/domain/months'
import { buildServiceDays, dateKey } from '@/lib/scheduler/serviceDays'
import { loadFormation, loadMembers, loadUnavailable } from '@/server/queries'
import { AvailabilityBoard, type RoleGroup } from './availability-board'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function currentMonth() {
  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams
  const fallback = currentMonth()
  const year = Number(params.year) || fallback.year
  const month = Number(params.month) || fallback.month

  const [members, unavailable, formation] = await Promise.all([
    loadMembers(),
    loadUnavailable(year, month),
    loadFormation(),
  ])

  const days = buildServiceDays(year, month).map((day) => ({
    key: dateKey(day.date),
    day: String(day.date.getUTCDate()).padStart(2, '0'),
    weekday: WEEKDAYS[day.date.getUTCDay()],
    /** Domingo tem culto de manhã e de noite; a disponibilidade vale para o dia. */
    services: day.services.length,
  }))

  const ativos = members.filter((m) => m.active)

  // Quem toca cada instrumento. Quem toca dois aparece nos dois grupos — e e
  // assim que se enxerga que faltar uma pessoa pode quebrar duas posicoes.
  const groups: RoleGroup[] = ROLES.map((role: Role) => ({
    role,
    label: ROLE_LABELS[role],
    needed: formation[role],
    members: ativos
      .filter((m) => m.roles.includes(role))
      .map((m) => ({ id: m.id, name: m.name })),
  })).filter((group) => group.members.length > 0 || group.needed > 0)

  return (
    <div>
      <PageBar icon={CalendarX2} title="Disponibilidade">
        <MonthPicker year={year} month={month} />
      </PageBar>

      <p className="mb-7 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Marque quem avisou que não pode. Quem estiver marcado fica de fora do sorteio
        daquele dia.
      </p>

      {ativos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre os integrantes antes de marcar a disponibilidade.
        </p>
      ) : (
        <section className="rounded-2xl border border-border">
          <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
            <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
              <CalendarCheck className="size-[18px] text-faint" />
              Cultos de {monthLabel(year, month)}
            </h2>
            <p className="text-xs text-faint">
              O número abaixo de cada dia é quanta gente sobra naquela posição.
            </p>
          </header>

          <div className="border-t border-border px-4 py-4 sm:px-5">
            <AvailabilityBoard
              caption={`Cultos de ${monthLabel(year, month)}`}
              days={days}
              groups={groups}
              unavailable={[...unavailable]}
            />
          </div>
        </section>
      )}
    </div>
  )
}
