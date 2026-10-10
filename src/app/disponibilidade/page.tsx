import { EXCEPTION_KIND_OPTIONS, ROLES, ROLE_SHORT_LABELS, type Role } from '@/lib/domain/types'
import { MonthPicker } from '@/components/month-picker'
import { PageHeader } from '@/components/page-header'
import { monthLabel } from '@/lib/domain/months'
import { buildServiceDays, dateKey } from '@/lib/scheduler/serviceDays'
import { listExceptions, loadFormation, loadMembers, loadUnavailable } from '@/server/queries'
import { AvailabilityBoard, type RoleGroup } from './availability-board'

export const dynamic = 'force-dynamic'

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const WEEKDAYS_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

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

  const [members, unavailable, formation, exceptions] = await Promise.all([
    loadMembers(),
    loadUnavailable(year, month),
    loadFormation(),
    listExceptions(year, month),
  ])

  const excecaoPorDia = new Map(exceptions.map((e) => [dateKey(e.date), e]))
  const mes = monthLabel(year, month).replace(/ de \d+$/, '')

  const days = buildServiceDays(year, month).map((day) => {
    const key = dateKey(day.date)
    const excecao = excecaoPorDia.get(key)
    const dia = String(day.date.getUTCDate()).padStart(2, '0')

    return {
      key,
      day: dia,
      weekday: WEEKDAYS[day.date.getUTCDay()],
      title: `${WEEKDAYS_LONG[day.date.getUTCDay()]}, ${day.date.getUTCDate()} de ${mes}`,
      services: day.services.length,
      note: excecao ? excecao.label?.trim() || EXCEPTION_KIND_OPTIONS[excecao.kind] : null,
    }
  })

  const ativos = members.filter((m) => m.active)

  const groups: RoleGroup[] = ROLES.map((role: Role) => ({
    role,
    label: ROLE_SHORT_LABELS[role],
    needed: formation[role],
    members: ativos
      .filter((m) => m.roles.includes(role))
      .map((m) => ({ id: m.id, name: m.name })),
  })).filter((group) => group.members.length > 0 || group.needed > 0)

  return (
    <>
      <PageHeader
        eyebrow="Disponibilidade"
        title={<MonthPicker year={year} month={month} />}
        description="Marque quem avisou que não pode. Quem estiver marcado fica fora do sorteio daquele dia."
      />

      {ativos.length === 0 ? (
        <p className="rounded-card border border-border bg-card px-5 py-8 text-sm text-muted-foreground">
          Cadastre os integrantes antes de marcar a disponibilidade.
        </p>
      ) : (
        <AvailabilityBoard
          caption={`Cultos de ${monthLabel(year, month)}`}
          days={days}
          groups={groups}
          unavailable={[...unavailable]}
        />
      )}
    </>
  )
}
