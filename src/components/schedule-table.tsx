'use client'

import { useTransition } from 'react'
import { Lock, LockOpen, Plus, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@/lib/domain/types'
import { A_DEFINIR, ROLE_SHORT_LABELS } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  addAssignmentAction,
  removeAssignmentAction,
  setAssignmentMemberAction,
  setEntryGestorAction,
  toggleAssignmentLockAction,
  toggleEntryLockAction,
} from '@/app/actions'

export type CellItem = {
  role: Role
  assignmentId: string
  memberId: string | null
  name: string
  isGestor: boolean
  locked: boolean
}

export type TableCell = {
  key: string
  roles: Role[]
  items: CellItem[]
}

export type TableRow = {
  entryId: string
  date: string
  dateKey: string
  day: string
  teamName: string
  teamColor: string
  locked: boolean
  exception?: boolean
  cells: TableCell[]
}

export type RosterMember = { id: string; name: string }

type Props = {
  headers: string[]
  rows: TableRow[]
  /** Quem toca cada instrumento, para o seletor de cada célula. */
  roster: Record<Role, RosterMember[]>
  /** Chaves `memberId:AAAA-MM-DD` de quem avisou que não pode. */
  unavailable: string[]
}

export function ScheduleTable({ headers, rows, roster, unavailable }: Props) {
  const [pending, startTransition] = useTransition()
  const unavailableSet = new Set(unavailable)

  const run = (action: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await action()
      } catch {
        toast.error('Não foi possível salvar a alteração.')
      }
    })

  return (
    <div className={cn('overflow-x-auto', pending && 'opacity-70')}>
        <table className="w-full border-collapse text-center text-[13px]">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="border border-black bg-[#CCC0DA] px-2 py-2.5 font-semibold text-black"
                >
                  {header}
                </th>
              ))}
              <th className="w-8 bg-card" />
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.entryId}>
                <td
                  className="tabular border border-black px-2 py-2 font-semibold whitespace-nowrap text-black"
                  style={{ backgroundColor: row.teamColor }}
                >
                  {row.date}
                </td>
                <td
                  className="border border-black px-2 py-2 font-semibold text-black"
                  style={{ backgroundColor: row.teamColor }}
                >
                  {row.day}
                </td>

                {row.cells.map((cell) => (
                  <td
                    key={cell.key}
                    className="group/cell relative border border-black p-0"
                    style={{ backgroundColor: row.teamColor }}
                  >
                    <div className="flex min-h-9 flex-wrap items-center justify-center">
                      {cell.items.map((item, index) => (
                        <span key={item.assignmentId} className="flex items-center">
                          {index > 0 && <span className="font-semibold text-black">/</span>}
                          <CellButton
                            item={item}
                            role={item.role}
                            entryId={row.entryId}
                            dateKey={row.dateKey}
                            roster={roster[item.role] ?? []}
                            unavailableSet={unavailableSet}
                            onAction={run}
                          />
                        </span>
                      ))}
                    </div>

                    {!row.exception && (
                      <AddButton
                        roles={cell.roles}
                        entryId={row.entryId}
                        dateKey={row.dateKey}
                        roster={roster}
                        taken={row.cells.flatMap((c) => c.items.map((i) => i.memberId))}
                        unavailableSet={unavailableSet}
                        onAction={run}
                      />
                    )}
                  </td>
                ))}

                <td
                  className="border border-black px-2 py-2 font-semibold whitespace-nowrap text-black italic"
                  style={{ backgroundColor: row.teamColor }}
                >
                  {row.teamName}
                </td>

                {/* Fora da área que vira planilha: trava da linha. */}
                <td className="bg-card pl-1.5">
                  <button
                    type="button"
                    onClick={() => run(() => toggleEntryLockAction(row.entryId))}
                    title={row.locked ? 'Destravar linha' : 'Travar linha'}
                    aria-pressed={row.locked}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-sm transition-colors',
                      row.locked
                        ? 'text-foreground'
                        : 'text-transparent hover:bg-secondary hover:text-muted-foreground',
                    )}
                  >
                    {row.locked ? (
                      <Lock className="size-3.5" />
                    ) : (
                      <LockOpen className="size-3.5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
      </table>
    </div>
  )
}

function CellButton({
  item,
  role,
  entryId,
  dateKey,
  roster,
  unavailableSet,
  onAction,
}: {
  item: CellItem
  role: Role
  entryId: string
  dateKey: string
  roster: RosterMember[]
  unavailableSet: Set<string>
  onAction: (action: () => Promise<void>) => void
}) {
  const vago = item.memberId === null
  const livres = roster.filter((m) => !unavailableSet.has(`${m.id}:${dateKey}`))
  const ocupados = roster.filter((m) => unavailableSet.has(`${m.id}:${dateKey}`))
  const travada = item.locked

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          'cursor-pointer rounded-sm px-1.5 py-2 font-semibold text-black italic underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none',
          vago && 'text-[#8B1A0B] not-italic',
          travada && 'ring-1 ring-black/40 ring-inset',
        )}
      >
        {vago ? (
          <span className="inline-flex items-center gap-1">
            <TriangleAlert className="size-3.5" />
            {A_DEFINIR}
          </span>
        ) : (
          <>
            {item.name}
            {item.isGestor && <span>/GESTOR</span>}
          </>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="center">
        <Command>
          <CommandInput placeholder="Buscar integrante" />
          <CommandList>
            <CommandEmpty>Ninguém cadastrado para {role.toLowerCase()}.</CommandEmpty>

            <CommandGroup heading="Disponíveis">
              {livres.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.name}
                  onSelect={() =>
                    onAction(() => setAssignmentMemberAction(item.assignmentId, member.id))
                  }
                >
                  {member.name}
                </CommandItem>
              ))}
            </CommandGroup>

            {ocupados.length > 0 && (
              <CommandGroup heading="Avisaram que não podem">
                {ocupados.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.name}
                    onSelect={() =>
                      onAction(() => setAssignmentMemberAction(item.assignmentId, member.id))
                    }
                    className="text-muted-foreground"
                  >
                    {member.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandSeparator />

            <CommandGroup>
              {!vago && !item.isGestor && (
                <CommandItem
                  onSelect={() =>
                    onAction(() => setEntryGestorAction(entryId, item.assignmentId))
                  }
                >
                  Marcar como gestor do culto
                </CommandItem>
              )}
              <CommandItem
                onSelect={() => onAction(() => toggleAssignmentLockAction(item.assignmentId))}
              >
                {item.locked ? 'Destravar célula' : 'Travar célula'}
              </CommandItem>
              {!vago && (
                <CommandItem
                  className="text-destructive"
                  onSelect={() => onAction(() => setAssignmentMemberAction(item.assignmentId, null))}
                >
                  Deixar em aberto
                </CommandItem>
              )}
              <CommandItem
                className="text-destructive"
                onSelect={() => onAction(() => removeAssignmentAction(item.assignmentId))}
              >
                Remover da escala
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function AddButton({
  roles,
  entryId,
  dateKey,
  roster,
  taken,
  unavailableSet,
  onAction,
}: {
  roles: Role[]
  entryId: string
  dateKey: string
  roster: Record<Role, RosterMember[]>
  taken: Array<string | null>
  unavailableSet: Set<string>
  onAction: (action: () => Promise<void>) => void
}) {
  const ocupados = new Set(taken)

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Adicionar integrante"
        title="Adicionar integrante"
        className="absolute top-1/2 right-0.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover/cell:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-black focus-visible:outline-none"
      >
        <Plus className="size-3.5" />
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="center">
        <Command>
          <CommandInput placeholder="Buscar integrante" />
          <CommandList>
            <CommandEmpty>Ninguém para adicionar.</CommandEmpty>

            {roles.map((role) => {
              const candidatos = (roster[role] ?? []).filter((m) => !ocupados.has(m.id))

              return (
                <CommandGroup
                  key={role}
                  heading={roles.length > 1 ? ROLE_SHORT_LABELS[role] : 'Adicionar'}
                >
                  {candidatos.map((member) => {
                    const indisponivel = unavailableSet.has(`${member.id}:${dateKey}`)

                    return (
                      <CommandItem
                        key={member.id}
                        value={`${role} ${member.name}`}
                        className={cn(indisponivel && 'text-muted-foreground')}
                        onSelect={() =>
                          onAction(() => addAssignmentAction(entryId, role, member.id))
                        }
                      >
                        {member.name}
                        {indisponivel && (
                          <span className="ml-auto text-xs">avisou que não pode</span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
