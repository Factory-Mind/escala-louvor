'use client'

import { useTransition } from 'react'
import { Lock, LockOpen, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@/lib/domain/types'
import { ROLE_SHORT_LABELS } from '@/lib/domain/types'
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
import { TeamChip } from '@/components/team-chip'
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
  label: string
  roles: Role[]
  items: CellItem[]
}

export type TableRow = {
  entryId: string
  dateKey: string
  weekday: string
  dayOfMonth: string
  slot: string
  teamName: string
  teamColor: string
  locked: boolean
  exception: { kind: string; label: string | null } | null
  cells: TableCell[]
}

export type RosterMember = { id: string; name: string }

type Props = {
  columns: Array<{ key: string; label: string }>
  rows: TableRow[]
  roster: Record<Role, RosterMember[]>
  unavailable: string[]
  firstOpenId?: string
}

type Run = (action: () => Promise<void>) => void

export function ScheduleTable({ columns, rows, roster, unavailable, firstOpenId }: Props) {
  const [pending, startTransition] = useTransition()
  const unavailableSet = new Set(unavailable)

  const run: Run = (action) =>
    startTransition(async () => {
      try {
        await action()
      } catch {
        toast.error('Não foi possível salvar a alteração.')
      }
    })

  const cellProps = { roster, unavailableSet, onAction: run }

  return (
    <div className={cn('transition-opacity', pending && 'opacity-70')}>
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] border-collapse text-sm">
          <thead>
            <tr className="bg-table-head text-left text-xs tracking-[0.04em] text-muted-foreground uppercase">
              <th scope="col" className="border-b border-border px-5 py-3 font-semibold">
                Culto
              </th>
              <th scope="col" className="border-b border-border px-3 py-3 font-semibold">
                Time
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="border-b border-border px-3 py-3 font-semibold whitespace-nowrap"
                >
                  {column.label}
                </th>
              ))}
              <th scope="col" className="w-12 border-b border-border">
                <span className="sr-only">Trava</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) =>
              row.exception ? (
                <tr key={row.entryId} className="stripes">
                  <td className="border-b border-divider px-5 py-4 align-middle">
                    <CultoLabel row={row} />
                  </td>
                  <td
                    colSpan={columns.length + 2}
                    className="border-b border-divider px-3 py-4 text-subtle"
                  >
                    <ExceptionText exception={row.exception} />
                  </td>
                </tr>
              ) : (
                <tr key={row.entryId} className="group/row">
                  <td className="border-b border-divider px-5 py-3.5 align-middle whitespace-nowrap">
                    <CultoLabel row={row} />
                  </td>
                  <td className="border-b border-divider px-3 py-3.5 whitespace-nowrap">
                    {row.teamName && <TeamChip name={row.teamName} color={row.teamColor} />}
                  </td>

                  {row.cells.map((cell) => (
                    <td
                      key={cell.key}
                      className="group/cell relative border-b border-divider py-2.5 pr-9 pl-3"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cell.items.map((item) => (
                          <CellButton
                            key={item.assignmentId}
                            id={item.assignmentId === firstOpenId ? 'vaga' : undefined}
                            item={item}
                            entryId={row.entryId}
                            dateKey={row.dateKey}
                            {...cellProps}
                          />
                        ))}
                        <AddButton
                          roles={cell.roles}
                          entryId={row.entryId}
                          dateKey={row.dateKey}
                          taken={row.cells.flatMap((c) => c.items.map((i) => i.memberId))}
                          className="absolute top-1/2 right-1.5 size-7 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                          {...cellProps}
                        />
                      </div>
                    </td>
                  ))}

                  <td className="border-b border-divider pr-3 text-right">
                    <RowLock
                      row={row}
                      onAction={run}
                      className={cn(
                        'size-9',
                        !row.locked && 'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100',
                      )}
                    />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) =>
          row.exception ? (
            <article
              key={row.entryId}
              className="stripes flex items-center gap-3 rounded-card border border-border px-4 py-3.5"
            >
              <CultoLabel row={row} />
              <ExceptionText exception={row.exception} />
            </article>
          ) : (
            <article
              key={row.entryId}
              className="overflow-hidden rounded-card border border-border bg-card"
            >
              <div className="flex items-center gap-3 border-b border-divider py-2 pr-1 pl-4">
                <DayBadge row={row} />
                <span className="flex-1 text-[15px] font-semibold">{row.slot}</span>
                {row.teamName && <TeamChip name={row.teamName} color={row.teamColor} />}
                <RowLock row={row} onAction={run} className="size-11" />
              </div>

              <div className="px-4 pt-1 pb-2">
                {row.cells.map((cell) => (
                  <div
                    key={cell.key}
                    className="flex min-h-11 items-center gap-3 border-b border-background last:border-0"
                  >
                    <span className="w-[108px] shrink-0 text-[13px] text-muted-foreground">
                      {cell.label}
                    </span>
                    <div className="flex flex-1 flex-wrap items-center gap-1.5 py-1.5">
                      {cell.items.map((item) => (
                        <CellButton
                          key={item.assignmentId}
                          id={item.assignmentId === firstOpenId ? 'vaga-m' : undefined}
                          item={item}
                          entryId={row.entryId}
                          dateKey={row.dateKey}
                          {...cellProps}
                        />
                      ))}
                      <AddButton
                        roles={cell.roles}
                        entryId={row.entryId}
                        dateKey={row.dateKey}
                        taken={row.cells.flatMap((c) => c.items.map((i) => i.memberId))}
                        {...cellProps}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ),
        )}
      </div>
    </div>
  )
}

function DayBadge({ row }: { row: TableRow }) {
  return (
    <div className="flex w-11 shrink-0 flex-col text-center">
      <span className="text-[11px] font-semibold text-muted-foreground">{row.weekday}</span>
      <span className="tabular text-xl leading-tight font-semibold">{row.dayOfMonth}</span>
    </div>
  )
}

function CultoLabel({ row }: { row: TableRow }) {
  return (
    <div className="flex items-center gap-3">
      <DayBadge row={row} />
      <span className="hidden text-subtle md:inline">{row.slot}</span>
    </div>
  )
}

function ExceptionText({ exception }: { exception: NonNullable<TableRow['exception']> }) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="rounded-full border border-input bg-card px-2.5 py-1 text-xs font-semibold tracking-[0.04em] text-subtle uppercase">
        {exception.kind}
      </span>
      {exception.label && <span className="font-medium text-foreground">{exception.label}</span>}
      <span className="text-muted-foreground">· ninguém escalado</span>
    </div>
  )
}

function RowLock({
  row,
  onAction,
  className,
}: {
  row: TableRow
  onAction: Run
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onAction(() => toggleEntryLockAction(row.entryId))}
      title={row.locked ? 'Destravar linha' : 'Travar linha'}
      aria-label={row.locked ? 'Destravar linha' : 'Travar linha'}
      aria-pressed={row.locked}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[10px] transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        row.locked
          ? 'text-foreground hover:bg-secondary'
          : 'text-faint hover:bg-secondary hover:text-foreground',
        className,
      )}
    >
      {row.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
    </button>
  )
}

function CellButton({
  id,
  item,
  entryId,
  dateKey,
  roster: rosterByRole,
  unavailableSet,
  onAction,
}: {
  id?: string
  item: CellItem
  entryId: string
  dateKey: string
  roster: Record<Role, RosterMember[]>
  unavailableSet: Set<string>
  onAction: Run
}) {
  const role = item.role
  const roster = rosterByRole[role] ?? []
  const vago = item.memberId === null
  const livres = roster.filter((m) => !unavailableSet.has(`${m.id}:${dateKey}`))
  const ocupados = roster.filter((m) => unavailableSet.has(`${m.id}:${dateKey}`))

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        className={cn(
          'inline-flex min-h-8 cursor-pointer scroll-mt-24 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          vago
            ? 'border-dashed border-danger-strong bg-danger-soft font-semibold text-destructive hover:bg-danger-border/40'
            : 'border-border bg-card font-medium text-foreground hover:border-rule-strong aria-expanded:border-rule-strong',
        )}
      >
        {vago ? (
          <>
            <Plus className="size-3.5" strokeWidth={2.4} />
            Escolher
          </>
        ) : (
          <>
            {item.name}
            {item.isGestor && (
              <span className="rounded-full bg-gestor-soft px-1.5 py-px text-[11px] font-semibold text-gestor-foreground">
                Gestor
              </span>
            )}
          </>
        )}
        {item.locked && (
          <Lock className="size-3 text-muted-foreground" aria-label="Célula travada" />
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
  className,
}: {
  roles: Role[]
  entryId: string
  dateKey: string
  roster: Record<Role, RosterMember[]>
  taken: Array<string | null>
  unavailableSet: Set<string>
  onAction: Run
  className?: string
}) {
  const ocupados = new Set(taken)

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Adicionar integrante"
        title="Adicionar integrante"
        className={cn(
          'inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-dashed border-input text-muted-foreground transition hover:border-rule-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          className,
        )}
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
