'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Lock, LockOpen, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@/lib/domain/types'
import { ROLE_SHORT_LABELS } from '@/lib/domain/types'
import { monthName } from '@/lib/domain/months'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TeamChip, TeamDot, teamStyle } from '@/components/team-chip'
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
  year?: number
  month?: number
  columns: Array<{ key: string; label: string }>
  rows: TableRow[]
  roster: Record<Role, RosterMember[]>
  unavailable: string[]
  firstOpenId?: string
}

type Run = (action: () => Promise<void>) => void

const WEEKDAYS_HEADER = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

const WEEKDAY_LONG: Record<string, string> = {
  DOM: 'Domingo',
  SEG: 'Segunda',
  TER: 'Terça',
  QUA: 'Quarta',
  QUI: 'Quinta',
  SEX: 'Sexta',
  SÁB: 'Sábado',
}

function iniciais(name: string) {
  return name.trim().slice(0, 2).toUpperCase()
}

function inferYearMonth(rows: TableRow[], year?: number, month?: number) {
  if (year && month) return { year, month }
  const first = rows[0]?.dateKey
  if (first && /^\d{4}-\d{2}/.test(first)) {
    return { year: Number(first.slice(0, 4)), month: Number(first.slice(5, 7)) }
  }
  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

export function ScheduleTable({
  year: propYear,
  month: propMonth,
  rows,
  roster,
  unavailable,
  firstOpenId,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const [activeEntryIdx, setActiveEntryIdx] = useState(0)
  const unavailableSet = new Set(unavailable)

  const { year, month } = inferYearMonth(rows, propYear, propMonth)

  const run: Run = (action) =>
    startTransition(async () => {
      try {
        await action()
      } catch {
        toast.error('Não foi possível salvar a alteração.')
      }
    })

  const cellProps = { roster, unavailableSet, onAction: run }

  const rowsByDate = useMemo(() => {
    const map = new Map<string, TableRow[]>()
    for (const row of rows) {
      const list = map.get(row.dateKey) ?? []
      list.push(row)
      map.set(row.dateKey, list)
    }
    return map
  }, [rows])

  const firstOpenRow = firstOpenId
    ? rows.find((r) => r.cells.some((c) => c.items.some((i) => i.assignmentId === firstOpenId)))
    : undefined

  useEffect(() => {
    const checkHash = () => {
      if ((window.location.hash === '#vaga' || window.location.hash === '#vaga-m') && firstOpenRow) {
        const dayRows = rowsByDate.get(firstOpenRow.dateKey) ?? []
        const idx = Math.max(0, dayRows.findIndex((r) => r.entryId === firstOpenRow.entryId))
        setSelectedDateKey(firstOpenRow.dateKey)
        setActiveEntryIdx(idx)
        history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    }
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [firstOpenRow, rowsByDate])

  const firstDayWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const calendarCells: Array<{ day: number; dateKey: string; dayRows: TableRow[] } | null> = []
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarCells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dk = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarCells.push({
      day: d,
      dateKey: dk,
      dayRows: rowsByDate.get(dk) ?? [],
    })
  }

  const selectedRows = selectedDateKey ? (rowsByDate.get(selectedDateKey) ?? []) : []
  const currentRow = selectedRows[activeEntryIdx] ?? selectedRows[0] ?? null

  const openDayModal = (dk: string, entryIdx = 0) => {
    setSelectedDateKey(dk)
    setActiveEntryIdx(entryIdx)
  }

  return (
    <div className={cn('transition-opacity', pending && 'opacity-70')}>
      {firstOpenRow && (
        <div className="sr-only">
          <button
            id="vaga"
            type="button"
            onClick={() => openDayModal(firstOpenRow.dateKey)}
          >
            Resolver vaga
          </button>
          <button
            id="vaga-m"
            type="button"
            onClick={() => openDayModal(firstOpenRow.dateKey)}
          >
            Resolver vaga
          </button>
        </div>
      )}

      <div className="p-2.5 sm:p-4 md:p-5">
        <div className="mb-2 grid grid-cols-7 gap-1.5 text-center sm:gap-2 md:mb-3 md:gap-2.5">
          {WEEKDAYS_HEADER.map((w) => (
            <div
              key={w}
              className="py-1 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase md:text-xs"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <div key={`empty-${index}`} className="min-h-[82px] sm:min-h-[108px] md:min-h-[128px]" />
            }

            const { day, dateKey: dk, dayRows } = cell
            const dayStr = String(day).padStart(2, '0')
            const hasService = dayRows.length > 0

            if (!hasService) {
              return (
                <div
                  key={dk}
                  className="flex min-h-[82px] flex-col rounded-xl bg-table-head/90 p-2 text-muted-foreground/70 sm:min-h-[108px] sm:rounded-2xl sm:p-2.5 md:min-h-[128px] md:p-3"
                >
                  <span className="tabular text-xs font-medium md:text-sm">{dayStr}</span>
                </div>
              )
            }

            const firstRow = dayRows[0]
            const exception = firstRow.exception
            const isSelected = selectedDateKey === dk

            const vagasNoDia = dayRows.reduce(
              (acc, r) =>
                acc + r.cells.reduce((cAcc, c) => cAcc + c.items.filter((i) => !i.memberId).length, 0),
              0,
            )

            const pessoasNoCulto = firstRow.cells.reduce(
              (acc, c) => acc + c.items.filter((i) => i.memberId).length,
              0,
            )

            const temTrava = dayRows.some(
              (r) => r.locked || r.cells.some((c) => c.items.some((i) => i.locked)),
            )

            if (exception) {
              return (
                <button
                  key={dk}
                  type="button"
                  onClick={() => openDayModal(dk, 0)}
                  className={cn(
                    'stripes group flex min-h-[82px] cursor-pointer flex-col items-start justify-between rounded-xl border border-border p-2 text-left transition-all hover:border-foreground/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-[108px] sm:rounded-2xl sm:p-2.5 md:min-h-[128px] md:p-3',
                    isSelected && 'ring-2 ring-foreground',
                  )}
                >
                  <span className="tabular text-sm font-bold text-foreground md:text-base">
                    {dayStr}
                  </span>

                  <div className="mt-1 flex w-full flex-col gap-1">
                    <span className="inline-flex max-w-full items-center self-start truncate rounded-full border border-border bg-card px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.03em] text-subtle uppercase md:px-2 md:text-[10px]">
                      {exception.kind}
                    </span>
                    {exception.label && (
                      <span className="line-clamp-2 text-[11px] leading-tight font-semibold text-foreground md:text-xs">
                        {exception.label}
                      </span>
                    )}
                  </div>
                </button>
              )
            }

            return (
              <button
                key={dk}
                type="button"
                onClick={() => openDayModal(dk, 0)}
                style={teamStyle(firstRow.teamColor)}
                className={cn(
                  'team-tint group flex min-h-[82px] cursor-pointer flex-col justify-between rounded-xl border p-2 text-left transition-all hover:border-foreground/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:min-h-[108px] sm:rounded-2xl sm:p-2.5 md:min-h-[128px] md:p-3',
                  isSelected && 'border-foreground ring-1 ring-foreground',
                )}
              >
                <div className="flex w-full items-center justify-between gap-1">
                  <span className="tabular text-sm font-bold text-foreground md:text-base">
                    {dayStr}
                  </span>
                  {temTrava && (
                    <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Com trava" />
                  )}
                </div>

                <div className="my-1 flex w-full flex-col gap-1">
                  {dayRows.map((r) => (
                    <span
                      key={r.entryId}
                      style={teamStyle(r.teamColor)}
                      className="team-pill flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold md:rounded-lg md:px-2 md:py-1 md:text-xs"
                    >
                      <TeamDot color={r.teamColor} className="size-1.5 rounded-[2px] md:size-2" />
                      <span className="truncate">
                        {r.slot === 'Culto de quarta' ? 'Noite' : r.slot}
                      </span>
                    </span>
                  ))}
                </div>

                <div className="mt-auto w-full pt-0.5">
                  {vagasNoDia > 0 ? (
                    <span className="block truncate text-[10px] font-semibold text-destructive md:text-xs">
                      {vagasNoDia} {vagasNoDia === 1 ? 'vaga em aberto' : 'vagas em aberto'}
                    </span>
                  ) : (
                    <span className="block truncate text-[10px] text-muted-foreground md:text-xs">
                      {pessoasNoCulto} {pessoasNoCulto === 1 ? 'pessoa' : 'pessoas'}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <Dialog
        open={selectedDateKey !== null && currentRow !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedDateKey(null)
        }}
      >
        {currentRow && (
          <DialogContent
            showCloseButton={false}
            className="max-h-[90dvh] gap-0 overflow-y-auto rounded-[24px] border border-border bg-card p-0 sm:max-w-[460px]"
          >
            <DialogHeader className="border-b border-divider px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-eyebrow">dia selecionado</span>
                  <DialogTitle className="text-xl font-bold tracking-[-0.02em] md:text-2xl">
                    {WEEKDAY_LONG[currentRow.weekday] ?? currentRow.weekday},{' '}
                    {Number(currentRow.dayOfMonth)} de {monthName(month)}
                  </DialogTitle>
                </div>

                {!currentRow.exception && (
                  <RowLock row={currentRow} onAction={run} className="size-9" />
                )}
              </div>

              <DialogDescription className="sr-only">
                Integrantes escalados por função para este culto.
              </DialogDescription>

              {selectedRows.length > 1 && !currentRow.exception && (
                <div
                  role="tablist"
                  aria-label="Escolher culto do dia"
                  className="mt-2 inline-flex self-start rounded-full bg-secondary p-1"
                >
                  {selectedRows.map((r, idx) => {
                    const active = idx === activeEntryIdx
                    return (
                      <button
                        key={r.entryId}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveEntryIdx(idx)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                          active
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {r.slot}
                      </button>
                    )
                  })}
                </div>
              )}

              {!currentRow.exception && (
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  {currentRow.teamName && (
                    <TeamChip name={currentRow.teamName} color={currentRow.teamColor} />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {currentRow.slot === 'Manhã'
                      ? 'Culto da manhã'
                      : currentRow.slot === 'Noite'
                        ? 'Culto da noite'
                        : currentRow.slot}
                  </span>
                </div>
              )}
            </DialogHeader>

            {currentRow.exception ? (
              <div className="px-5 py-6">
                <ExceptionText exception={currentRow.exception} />
              </div>
            ) : (
              <div className="divide-y divide-divider px-5 py-1">
                {currentRow.cells.map((cell) => (
                  <div
                    key={cell.key}
                    className="flex min-h-12 items-center justify-between gap-3 py-2.5"
                  >
                    <span className="w-[110px] shrink-0 text-[13px] text-muted-foreground">
                      {cell.label}
                    </span>

                    <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
                      {cell.items.map((item) => (
                        <CellButton
                          key={item.assignmentId}
                          item={item}
                          entryId={currentRow.entryId}
                          dateKey={currentRow.dateKey}
                          {...cellProps}
                        />
                      ))}
                      <AddButton
                        roles={cell.roles}
                        entryId={currentRow.entryId}
                        dateKey={currentRow.dateKey}
                        taken={currentRow.cells.flatMap((c) => c.items.map((i) => i.memberId))}
                        {...cellProps}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-divider px-5 py-4">
              <DialogClose
                render={
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full bg-tray hover:bg-secondary"
                  />
                }
              >
                Fechar
              </DialogClose>
            </div>
          </DialogContent>
        )}
      </Dialog>
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
      title={row.locked ? 'Destravar culto' : 'Travar culto'}
      aria-label={row.locked ? 'Destravar culto' : 'Travar culto'}
      aria-pressed={row.locked}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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
          'inline-flex min-h-8 cursor-pointer scroll-mt-24 items-center gap-1.5 rounded-full border text-[13px] whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          vago
            ? 'border-dashed border-danger-strong bg-danger-soft px-3 font-semibold text-destructive hover:bg-danger-border/40'
            : 'border-border bg-card py-0.5 pr-2.5 pl-1 font-medium text-foreground hover:border-rule-strong aria-expanded:border-rule-strong',
        )}
      >
        {vago ? (
          <>
            <Plus className="size-3.5" strokeWidth={2.4} />
            Escolher
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-subtle"
            >
              {iniciais(item.name)}
            </span>
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
          'inline-flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-input text-muted-foreground transition hover:border-rule-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
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
