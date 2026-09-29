import { Users } from 'lucide-react'
import { PageBar } from '@/components/page-bar'
import { loadMembers } from '@/server/queries'
import { MemberList } from './member-list'

export const dynamic = 'force-dynamic'

export default async function MembersPage() {
  const members = await loadMembers()

  const ativos = members.filter((m) => m.active)
  const gestores = ativos.filter((m) => m.isGestor).length
  const ministros = ativos.filter((m) => m.isMinistro).length

  return (
    <div>
      <PageBar icon={Users} title="Integrantes">
        <span className="tabular text-sm text-muted-foreground">
          {ativos.length} {ativos.length === 1 ? 'ativo' : 'ativos'} · {gestores}{' '}
          {gestores === 1 ? 'gestor' : 'gestores'} · {ministros}{' '}
          {ministros === 1 ? 'ministro' : 'ministros'}
        </span>
      </PageBar>

      <p className="mb-7 max-w-prose text-sm leading-relaxed text-muted-foreground">
        Marque o que cada pessoa toca. Quem pode ser gestor aparece com a marca
        /GESTOR na planilha. Ministros são vocais com mais tempo de casa: a escala sempre
        leva um por naipe vocal.
      </p>

      <MemberList members={members} />
    </div>
  )
}
