'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ROLES, ROLE_SHORT_LABELS, VOCAL_ROLES, type Role } from '@/lib/domain/types'
import type { GeneratorMember } from '@/lib/scheduler/generate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  createMemberAction,
  deleteMemberAction,
  renameMemberAction,
  setMemberFlagAction,
  toggleMemberRoleAction,
} from './actions'

export function MemberList({ members }: { members: GeneratorMember[] }) {
  const [pending, startTransition] = useTransition()
  const [novo, setNovo] = useState('')

  const run = (action: () => Promise<void>, sucesso?: string) =>
    startTransition(async () => {
      try {
        await action()
        if (sucesso) toast.success(sucesso)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
      }
    })

  /** Quantos ativos cobrem cada posicao. */
  const cobertura = new Map<Role, number>(
    ROLES.map((role) => [
      role,
      members.filter((m) => m.active && m.roles.includes(role)).length,
    ]),
  )

  const adicionar = () => {
    if (!novo.trim()) return
    run(async () => {
      await createMemberAction(novo)
      setNovo('')
    }, 'Integrante adicionado.')
  }

  return (
    <div className={cn(pending && 'opacity-70')}>
      <div className="mb-8 flex max-w-sm gap-2">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          placeholder="Nome do integrante"
          aria-label="Nome do integrante"
        />
        <Button onClick={adicionar} variant="outline">
          <Plus />
          Adicionar
        </Button>
      </div>

      {/* Cabecalho e resumo na mesma linha: o nome da posicao ja rotula a coluna,
          e o numero ao lado diz quantos ativos cobrem ela. Duas informacoes que
          antes ocupavam duas faixas separadas dizendo os mesmos 7 nomes. */}
      <div className="hidden pl-44 md:flex">
        {ROLES.map((role) => {
          const total = cobertura.get(role) ?? 0

          return (
            <span
              key={role}
              className="flex w-[82px] shrink-0 items-baseline justify-center gap-1 px-1 text-[11px]"
            >
              <span className="text-faint">{ROLE_SHORT_LABELS[role]}</span>
              <span
                className={cn(
                  'tabular font-semibold',
                  total === 0 ? 'text-destructive' : 'text-muted-foreground',
                )}
                title={`${total} ativos cobrem ${ROLE_SHORT_LABELS[role]}`}
              >
                {total}
              </span>
            </span>
          )
        })}
      </div>

      <ul className="mt-1.5 divide-y divide-border border-y border-border">
        {members.map((member) => (
          <li
            key={member.id}
            className={cn(
              'group/row flex flex-wrap items-center gap-x-4 gap-y-2 py-1.5',
              !member.active && 'opacity-45',
            )}
          >
            <Input
              defaultValue={member.name}
              aria-label={`Nome de ${member.name}`}
              className="h-8 w-40 shrink-0 border-transparent bg-transparent px-1 font-medium shadow-none hover:border-input focus-visible:border-input"
              onBlur={(e) => {
                const value = e.target.value.trim()
                if (value && value.toUpperCase() !== member.name) {
                  run(() => renameMemberAction(member.id, value))
                }
              }}
            />

            <div className="flex flex-wrap">
              {ROLES.map((role) => (
                <RoleChip
                  key={role}
                  role={role}
                  checked={member.roles.includes(role)}
                  onToggle={(next) => run(() => toggleMemberRoleAction(member.id, role, next))}
                />
              ))}
            </div>

            <div className="ml-auto flex items-center gap-4 pr-1">
              <div className="w-24">
                {VOCAL_ROLES.some((role) => member.roles.includes(role)) && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Switch
                      checked={member.isMinistro}
                      onCheckedChange={(v) =>
                        run(() => setMemberFlagAction(member.id, 'isMinistro', v))
                      }
                    />
                    Ministro
                  </label>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={member.isGestor}
                  onCheckedChange={(v) =>
                    run(() => setMemberFlagAction(member.id, 'isGestor', v))
                  }
                />
                Gestor
              </label>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  checked={member.active}
                  onCheckedChange={(v) =>
                    run(() => setMemberFlagAction(member.id, 'active', v))
                  }
                />
                Ativo
              </label>

              {/* Some ate a linha ser apontada: 31 lixeiras visiveis de uma vez
                  pesavam mais que o proprio cadastro. */}
              <button
                type="button"
                aria-label={`Excluir ${member.name}`}
                onClick={() => run(() => deleteMemberAction(member.id), 'Integrante excluído.')}
                className="flex size-8 items-center justify-center rounded-md text-faint opacity-0 transition hover:bg-secondary hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none group-hover/row:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {members.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Nenhum integrante ainda. Adicione o primeiro acima.
        </p>
      )}
    </div>
  )
}

/**
 * A posicao marcada e solida; a nao marcada nao desenha caixa nenhuma.
 *
 * Sao 7 posicoes por pessoa: com todas as caixas desenhadas, 31 integrantes
 * viravam 217 retangulos identicos e o que a pessoa realmente toca sumia no
 * meio. A borda so aparece quando a linha e apontada, para continuar obvio que
 * da para clicar.
 */
function RoleChip({
  role,
  checked,
  onToggle,
}: {
  role: Role
  checked: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <div className="w-[82px] shrink-0 px-1 py-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={ROLE_SHORT_LABELS[role]}
        onClick={() => onToggle(!checked)}
        className={cn(
          'w-full rounded-full border px-1 py-1 text-[11px] leading-4 transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          checked
            ? 'border-foreground bg-foreground font-medium text-background'
            : 'border-transparent text-faint group-hover/row:border-border hover:!border-foreground hover:text-foreground',
        )}
      >
        {ROLE_SHORT_LABELS[role]}
      </button>
    </div>
  )
}
