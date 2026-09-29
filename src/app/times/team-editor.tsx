'use client'

import { useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { createTeamAction, deleteTeamAction, updateTeamAction } from './actions'

export type TeamView = {
  id: string
  name: string
  color: string
  active: boolean
}

export function TeamEditor({ teams }: { teams: TeamView[] }) {
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

  return (
    <div className={cn('space-y-4', pending && 'opacity-70')}>
      <ul className="divide-y divide-border">
        {teams.map((team) => (
          <li
            key={team.id}
            className={cn('flex items-center gap-4 py-2', !team.active && 'opacity-50')}
          >
            {/* A cor é dado: é exatamente o que pinta a linha no .xlsx. */}
            <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-sm border border-border">
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
              className="h-8 w-40 border-transparent bg-transparent px-1 font-medium shadow-none hover:border-input focus-visible:border-input"
              onBlur={(e) =>
                e.target.value.trim() &&
                e.target.value !== team.name &&
                run(() => updateTeamAction(team.id, { name: e.target.value }))
              }
            />

            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Switch
                checked={team.active}
                onCheckedChange={(v) => run(() => updateTeamAction(team.id, { active: v }))}
              />
              No rodízio
            </label>

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Excluir ${team.name}`}
              onClick={() => run(() => deleteTeamAction(team.id), 'Time excluído.')}
            >
              <Trash2 className="text-muted-foreground" />
            </Button>
          </li>
        ))}
      </ul>

      <Button variant="outline" onClick={() => run(() => createTeamAction(), 'Time criado.')}>
        <Plus />
        Nova cor
      </Button>
    </div>
  )
}
