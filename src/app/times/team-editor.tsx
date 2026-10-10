'use client'

import { useTransition } from 'react'
import { Ellipsis, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { createTeamAction, deleteTeamAction, updateTeamAction } from './actions'

export type TeamView = {
  id: string
  name: string
  color: string
  active: boolean
}

function useRun() {
  const [pending, startTransition] = useTransition()

  const run = (action: () => Promise<void>, sucesso?: string) =>
    startTransition(async () => {
      try {
        await action()
        if (sucesso) toast.success(sucesso)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.')
      }
    })

  return [pending, run] as const
}

export function NewTeamButton() {
  const [pending, run] = useRun()

  return (
    <Button
      variant="outline"
      className="h-10 rounded-[10px] bg-card px-3.5 text-sm"
      disabled={pending}
      onClick={() => run(() => createTeamAction(), 'Time criado.')}
    >
      <Plus />
      Nova cor
    </Button>
  )
}

export function TeamEditor({ teams }: { teams: TeamView[] }) {
  const [pending, run] = useRun()

  return (
    <ul className={cn('px-2 py-1 md:px-3 md:py-2', pending && 'opacity-70')}>
      {teams.map((team, index) => (
        <li
          key={team.id}
          className={cn(
            'flex items-center gap-3 border-b border-divider px-2 py-2 last:border-0',
            !team.active && 'opacity-55',
          )}
        >
          <span className="tabular w-5 text-[13px] font-semibold text-muted-foreground">
            {index + 1}
          </span>

          <label className="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-black/10 focus-within:ring-2 focus-within:ring-ring">
            <span className="sr-only">Cor do {team.name}</span>
            <span className="block size-full" style={{ backgroundColor: team.color }} />
            <input
              type="color"
              defaultValue={team.color}
              className="absolute inset-0 cursor-pointer opacity-0"
              onBlur={(e) =>
                e.target.value !== team.color &&
                run(() => updateTeamAction(team.id, { color: e.target.value }))
              }
            />
          </label>

          <Input
            defaultValue={team.name}
            aria-label={`Nome do ${team.name}`}
            className="h-10 min-w-0 flex-1 border-transparent bg-transparent px-1.5 text-[15px] font-medium shadow-none hover:border-input focus-visible:border-input md:text-[15px]"
            onBlur={(e) =>
              e.target.value.trim() &&
              e.target.value !== team.name &&
              run(() => updateTeamAction(team.id, { name: e.target.value }))
            }
          />

          <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-[13px] text-subtle md:text-sm">
            <Checkbox
              checked={team.active}
              onCheckedChange={(v) => run(() => updateTeamAction(team.id, { active: v }))}
              className="size-[18px]"
            />
            <span className="md:hidden">Rodízio</span>
            <span className="hidden md:inline">No rodízio</span>
          </label>

          <Popover>
            <PopoverTrigger
              aria-label={`Mais opções do ${team.name}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Ellipsis className="size-[18px]" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <button
                type="button"
                onClick={() => run(() => deleteTeamAction(team.id), 'Time excluído.')}
                className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 text-sm text-destructive hover:bg-danger-soft"
              >
                <Trash2 className="size-4" />
                Excluir time
              </button>
            </PopoverContent>
          </Popover>
        </li>
      ))}
    </ul>
  )
}
