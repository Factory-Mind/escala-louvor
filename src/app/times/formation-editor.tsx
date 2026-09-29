'use client'

import { useOptimistic, useTransition } from 'react'
import { Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ROLES, ROLE_LABELS, type Role } from '@/lib/domain/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { setFormationAction } from './actions'

export function FormationEditor({ formation }: { formation: Record<Role, number> }) {
  const [pending, startTransition] = useTransition()

  // O contador responde na hora; o servidor confirma em seguida.
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

  return (
    <ul className={cn('divide-y divide-border', pending && 'opacity-70')}>
      {ROLES.map((role) => {
        const count = valores[role]

        return (
          <li key={role} className="flex items-center justify-between gap-4 py-2">
            <span className="text-sm">{ROLE_LABELS[role]}</span>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Menos um em ${ROLE_LABELS[role]}`}
                disabled={count === 0}
                onClick={() => mudar(role, count - 1)}
              >
                <Minus />
              </Button>

              <span
                aria-live="polite"
                className="tabular w-8 text-center text-sm font-medium"
              >
                {count}
              </span>

              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={`Mais um em ${ROLE_LABELS[role]}`}
                disabled={count === 6}
                onClick={() => mudar(role, count + 1)}
              >
                <Plus />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
