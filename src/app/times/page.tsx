import { Palette, SlidersHorizontal, Repeat } from 'lucide-react'
import { prisma } from '@/lib/db'
import { loadFormation } from '@/server/queries'
import { ROLES } from '@/lib/domain/types'
import { PageBar } from '@/components/page-bar'
import { FormationEditor } from './formation-editor'
import { TeamEditor, type TeamView } from './team-editor'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const [rows, formation] = await Promise.all([
    prisma.team.findMany({ orderBy: { order: 'asc' } }),
    loadFormation(),
  ])

  const teams: TeamView[] = rows.map((team) => ({
    id: team.id,
    name: team.name,
    color: team.color,
    active: team.active,
  }))

  const porCulto = ROLES.reduce((total, role) => total + (formation[role] ?? 0), 0)
  const noRodizio = teams.filter((t) => t.active).length

  return (
    <div>
      <PageBar icon={Palette} title="Times e formação" />

      <p className="mb-6 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Ninguém é fixo em um time. A escala é montada a partir de quem está disponível
        — o time só diz quantas pessoas entram e de que cor a linha fica na planilha.
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card
          icon={SlidersHorizontal}
          title="Formação"
          meta={`${porCulto} ${porCulto === 1 ? 'pessoa' : 'pessoas'} por culto`}
          description="Quantas pessoas cada posição leva em cada culto."
        >
          <FormationEditor formation={formation} />
        </Card>

        <Card
          icon={Repeat}
          title="Cores do rodízio"
          meta={`${noRodizio} ${noRodizio === 1 ? 'cor' : 'cores'}`}
          description="Cada semana tem duas vagas: o domingo, que vale para os cultos da manhã e da noite, e a quarta. As cores giram na ordem abaixo, e a quarta entra meia volta à frente — é isso que impede o time que dobrou no domingo de voltar na quarta da mesma semana."
        >
          <TeamEditor teams={teams} />
        </Card>
      </div>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  meta,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  meta: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border">
      <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
          <Icon className="size-[18px] text-faint" />
          {title}
        </h2>
        <span className="tabular text-sm text-muted-foreground">{meta}</span>
      </header>

      <div className="border-t border-border px-4 py-4 sm:px-5">
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children}
      </div>
    </section>
  )
}
