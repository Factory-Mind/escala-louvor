'use client'

import { useOptimistic, useTransition } from 'react'
import { Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_SHORT_LABELS, type Role } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { setFormationAction } from './actions'

const GROUPS: Array<{ name: string; roles: Role[] }> = [
  { name: 'Vozes', roles: ['VOCAL_MASC', 'VOCAL_FEM'] },
  { name: 'Banda', roles: ['TECLADO', 'BAIXO', 'GUITARRA', 'BATERIA'] },
  { name: 'Técnica', roles: ['SOM', 'PROJECAO'] },
]

const LOAD_ALTA = 4

function formatLoad(value: number) {
  return (Math.round(value * 10) / 10).toLocaleString('pt-BR')
}

export function FormationEditor({
  formation,
  people,
  dias,
}: {
  formation: Record<Role, number>
  people: Record<Role, number>
  dias: number
}) {
  const [pending, startTransition] = useTransition()

  const [valores, ajustar] = useOptimistic(
    formation,
    (state, { role, count }: { role: Role; count: number }) => ({ ...state, [role]: count }),
  )

  const mudar = (role: Role, count: number) => {
    if (count < 0 || count > 6) return

    startTransition(async () => {
      ajustar({ role, count })

      try {
        await setFormationAction(role, count)
      } catch {
        toast.error('Não foi possível salvar a formação.')
      }
    })
  }

  const carga = (role: Role) => {
    const total = people[role] ?? 0
    return total > 0 ? (dias * valores[role]) / total : null
  }

  const alertas = GROUPS.flatMap((g) => g.roles).filter((role) => {
    const total = people[role] ?? 0
    const valor = carga(role)
    return valores[role] > 0 && (total < valores[role] || (valor !== null && valor >= LOAD_ALTA))
  })

  return (
    <div className={cn(pending && 'opacity-70')}>
      {GROUPS.map((group) => (
        <div key={group.name} className="px-4 pt-2 pb-1 md:px-5">
          <h3 className="mt-3 mb-1 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {group.name}
          </h3>
          <ul>
            {group.roles.map((role) => {
              const count = valores[role]
              const total = people[role] ?? 0
              const valor = carga(role)
              const alta = valor !== null && valor >= LOAD_ALTA

              return (
                <li
                  key={role}
                  className="flex items-center gap-3 border-b border-divider py-2 last:border-0 md:py-2.5"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-medium">{ROLE_SHORT_LABELS[role]}</span>
                    <span
                      className={cn(
                        'text-xs md:text-[13px]',
                        alta || total < count ? 'text-warning-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {total} {total === 1 ? 'cadastrado' : 'cadastrados'}
                      {valor !== null && count > 0 && (
                        <> · ≈ {formatLoad(valor)} escalas/mês por pessoa</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center rounded-[10px] border border-border">
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center rounded-l-[10px] hover:bg-secondary disabled:opacity-40 md:size-10"
                      aria-label={`Menos um em ${ROLE_SHORT_LABELS[role]}`}
                      disabled={count === 0}
                      onClick={() => mudar(role, count - 1)}
                    >
                      <Minus className="size-4" />
                    </button>
                    <span
                      aria-live="polite"
                      className="tabular min-w-7 text-center text-[15px] font-semibold"
                    >
                      {count}
                    </span>
                    <button
                      type="button"
                      className="flex size-11 items-center justify-center rounded-r-[10px] hover:bg-secondary disabled:opacity-40 md:size-10"
                      aria-label={`Mais um em ${ROLE_SHORT_LABELS[role]}`}
                      disabled={count === 6}
                      onClick={() => mudar(role, count + 1)}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {alertas.length > 0 && (
        <ul className="mx-4 mt-3 mb-4 flex flex-col gap-1 rounded-xl bg-warning-soft px-3.5 py-3 text-sm leading-snug text-warning-foreground md:mx-5 md:mb-5">
          {alertas.map((role) => {
            const total = people[role] ?? 0

            return (
              <li key={role}>
                {total < valores[role]
                  ? `${ROLE_SHORT_LABELS[role]} pede ${valores[role]} por culto, mas só tem ${total} ${total === 1 ? 'cadastrado' : 'cadastrados'}.`
                  : `${ROLE_SHORT_LABELS[role]} tem só ${total} ${total === 1 ? 'pessoa' : 'pessoas'}: cada uma entra em ≈ ${formatLoad(carga(role) ?? 0)} das ${dias} datas do mês.`}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
