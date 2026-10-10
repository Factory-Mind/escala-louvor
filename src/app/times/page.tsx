import { prisma } from '@/lib/db'
import { loadFormation, loadMembers } from '@/server/queries'
import { ROLES, type Role } from '@/lib/domain/types'
import { PageHeader } from '@/components/page-header'
import { teamStyle } from '@/components/team-chip'
import { assignTeams } from '@/lib/scheduler/rotation'
import { buildServiceDays, type ServiceDay } from '@/lib/scheduler/serviceDays'
import { FormationEditor } from './formation-editor'
import { NewTeamButton, TeamEditor, type TeamView } from './team-editor'

export const dynamic = 'force-dynamic'

const DIA = 86_400_000

function proximasSemanas(teams: TeamView[], orders: Map<string, number>) {
  const ativos = teams
    .filter((t) => t.active)
    .map((t) => ({ id: t.id, name: t.name, color: t.color, order: orders.get(t.id) ?? 0 }))

  if (ativos.length === 0) return null

  const hoje = new Date()
  const base = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  const domingo = base - new Date(base).getUTCDay() * DIA
  const semanas = Array.from({ length: ativos.length }, (_, i) => domingo + i * 7 * DIA)

  const posicao = new Map(teams.map((t, index) => [t.id, index + 1]))
  const resolver = (dias: ServiceDay[]) =>
    assignTeams(dias, ativos).map((dia) => ({
      key: dia.date.toISOString(),
      name: dia.team.name,
      color: dia.team.color,
      pos: posicao.get(dia.team.id) ?? 0,
    }))

  return {
    domingos: resolver(
      semanas.map((t): ServiceDay => ({ date: new Date(t), services: ['DOM_MANHA', 'DOM_NOITE'] })),
    ),
    quartas: resolver(
      semanas.map((t): ServiceDay => ({ date: new Date(t + 3 * DIA), services: ['QUARTA'] })),
    ),
  }
}

export default async function TeamsPage() {
  const [rows, formation, members] = await Promise.all([
    prisma.team.findMany({ orderBy: { order: 'asc' } }),
    loadFormation(),
    loadMembers(),
  ])

  const teams: TeamView[] = rows.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    active: team.active,
  }))

  const porCulto = ROLES.reduce((total, role) => total + (formation[role] ?? 0), 0)

  const people = Object.fromEntries(
    ROLES.map((role) => [role, members.filter((m) => m.active && m.roles.includes(role)).length]),
  ) as Record<Role, number>

  const agora = new Date()
  const cultos = buildServiceDays(agora.getUTCFullYear(), agora.getUTCMonth() + 1).reduce(
    (total, dia) => total + dia.services.length,
    0,
  )

  const rodizio = proximasSemanas(teams, new Map(rows.map((r) => [r.id, r.order])))

  return (
    <>
      <PageHeader
        title="Times e formação"
        description="Ninguém é fixo em um time. A formação diz quantas pessoas entram em cada culto, e o time é só a cor da vez no rodízio."
      />

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="overflow-hidden rounded-card border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5 md:px-5 md:py-[18px]">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[17px] font-semibold md:text-lg">Formação por culto</h2>
              <span className="hidden text-sm text-muted-foreground md:block">
                Quantas pessoas cada posição leva
              </span>
            </div>
            <span className="tabular rounded-full bg-secondary px-2.5 py-1 text-[13px] font-semibold md:px-3 md:py-1.5 md:text-sm">
              {porCulto} {porCulto === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </div>

          <FormationEditor formation={formation} people={people} dias={cultos} />
        </section>

        <section className="overflow-hidden rounded-card border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-4 py-3.5 md:px-5 md:py-[18px]">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[17px] font-semibold md:text-lg">Cores do rodízio</h2>
              <span className="hidden text-sm text-muted-foreground md:block">
                A cor é exatamente a que pinta a linha no .xlsx
              </span>
            </div>
            <NewTeamButton />
          </div>

          <TeamEditor teams={teams} />

          <div className="mx-4 mt-2 mb-4 flex flex-col gap-3 rounded-xl bg-tray p-3.5 md:mx-5 md:mb-5 md:p-4">
            <span className="text-sm font-semibold">Como o rodízio anda</span>

            {rodizio && (
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <Sequencia titulo="Domingos (manhã e noite)" itens={rodizio.domingos} />
                <Sequencia titulo="Quartas (meia volta à frente)" itens={rodizio.quartas} />
              </div>
            )}

            <p className="text-[13px] leading-normal text-muted-foreground">
              Cada semana tem duas vagas: o domingo, que vale para os cultos da manhã e da noite, e
              a quarta. As cores giram na ordem acima, e a quarta entra meia volta à frente — é
              isso que impede o time que dobrou no domingo de voltar na quarta da mesma semana.
            </p>
          </div>
        </section>
      </div>
    </>
  )
}

function Sequencia({
  titulo,
  itens,
}: {
  titulo: string
  itens: Array<{ key: string; name: string; color: string; pos: number }>
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-muted-foreground">{titulo}</span>
      <div className="flex items-center gap-1">
        {itens.map((item) => (
          <span
            key={item.key}
            title={item.name}
            className="team-chip tabular flex size-8 items-center justify-center rounded-lg text-[13px] font-semibold"
            style={teamStyle(item.color)}
          >
            {item.pos}
          </span>
        ))}
        <span className="ml-1 text-[13px] text-muted-foreground">→ repete</span>
      </div>
    </div>
  )
}
