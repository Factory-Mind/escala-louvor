'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { Check, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { toggleUnavailabilityAction } from './actions'

export type Day = {
  key: string
  day: string
  weekday: string
  title: string
  services: number
  note: string | null
}

export type RoleGroup = {
  role: Role
  label: string
  needed: number
  members: Array<{ id: string; name: string }>
}

type Props = {
  caption: string
  days: Day[]
  groups: RoleGroup[]
  unavailable: string[]
}

type Status = 'off' | 'falta' | 'justo' | 'ok'

const STATUS_CLASS: Record<Status, string> = {
  off: 'border-divider bg-tray text-faint',
  falta: 'border-destructive/70 bg-danger-soft text-danger-foreground',
  justo: 'border-warning-border bg-warning-soft text-warning-foreground',
  ok: 'border-border bg-secondary text-subtle',
}

function statusOf(livres: number, needed: number, off: boolean): Status {
  if (off) return 'off'
  if (livres < needed) return 'falta'
  if (livres === needed) return 'justo'
  return 'ok'
}

export function AvailabilityBoard({ caption, days, groups, unavailable }: Props) {
  const [, startTransition] = useTransition()
  const [busca, setBusca] = useState('')
  const [recolhidos, setRecolhidos] = useState<Set<Role>>(new Set())
  const [abertosNoDia, setAbertosNoDia] = useState<Set<Role>>(new Set())
  const [diaSelecionado, setDiaSelecionado] = useState(
    () => (days.find((d) => !d.note) ?? days[0])?.key ?? '',
  )

  const alternar = (set: Set<Role>, role: Role) => {
    const next = new Set(set)
    if (next.has(role)) next.delete(role)
    else next.add(role)
    return next
  }

  const todosRecolhidos = recolhidos.size === groups.length
  const alternarTodos = () =>
    setRecolhidos(todosRecolhidos ? new Set() : new Set(groups.map((g) => g.role)))

  const [marcados, marcar] = useOptimistic(
    new Set(unavailable),
    (state, { key, value }: { key: string; value: boolean }) => {
      const next = new Set(state)
      if (value) next.add(key)
      else next.delete(key)
      return next
    },
  )

  const definir = (memberId: string, day: string, value: boolean) =>
    startTransition(async () => {
      marcar({ key: `${memberId}:${day}`, value })

      try {
        await toggleUnavailabilityAction(memberId, day, value)
      } catch {
        toast.error('Não foi possível salvar a disponibilidade.')
      }
    })

  const disponiveis = useMemo(() => {
    const contagem = new Map<string, number>()

    for (const group of groups) {
      for (const day of days) {
        const livres = group.members.filter((m) => !marcados.has(`${m.id}:${day.key}`)).length
        contagem.set(`${group.role}:${day.key}`, livres)
      }
    }

    return contagem
  }, [groups, days, marcados])

  const faltas = useMemo(
    () =>
      groups.flatMap((group) =>
        days
          .filter(
            (day) =>
              !day.note && (disponiveis.get(`${group.role}:${day.key}`) ?? 0) < group.needed,
          )
          .map((day) => ({ group, day })),
      ),
    [groups, days, disponiveis],
  )

  const total = marcados.size
  const termo = busca.trim().toLowerCase()

  const filtrados = termo
    ? groups
        .map((g) => ({
          ...g,
          members: g.members.filter((m) => m.name.toLowerCase().includes(termo)),
        }))
        .filter((g) => g.members.length > 0)
    : groups

  const dia = days.find((d) => d.key === diaSelecionado) ?? days[0]
  const ausentesNoDia = dia
    ? new Set(
        groups.flatMap((g) => g.members).filter((m) => marcados.has(`${m.id}:${dia.key}`)).map((m) => m.id),
      ).size
    : 0

  return (
    <>
      {faltas.length > 0 && (
        <div
          role="status"
          className="rounded-tile border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-foreground"
        >
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4 shrink-0 text-destructive" />
            {faltas.length === 1
              ? 'Uma posição não fecha com as marcações de hoje'
              : `${faltas.length} posições não fecham com as marcações de hoje`}
          </p>
          <ul className="mt-1.5 space-y-0.5 pl-6">
            {faltas.slice(0, 6).map(({ group, day }) => (
              <li key={`${group.role}:${day.key}`}>
                <span className="tabular">
                  {day.day}/{day.weekday}
                </span>{' '}
                — {group.label}: {disponiveis.get(`${group.role}:${day.key}`)} de {group.needed}
              </li>
            ))}
            {faltas.length > 6 && <li>e mais {faltas.length - 6}.</li>}
          </ul>
        </div>
      )}

      <section className="hidden overflow-hidden rounded-card border border-border bg-card md:block">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4">
          <div className="flex min-h-11 w-[340px] items-center gap-2 rounded-[10px] border border-input bg-card px-3.5">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar integrante"
              aria-label="Buscar integrante"
              className="min-h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-subtle">
            <Legenda status="off" texto="Dia especial" />
            <Legenda status="justo" texto="Sem reserva" />
            <Legenda status="falta" texto="Falta gente" />
            <button
              type="button"
              onClick={alternarTodos}
              className="flex min-h-10 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm text-foreground hover:border-rule-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {todosRecolhidos ? (
                <ChevronsUpDown className="size-4" />
              ) : (
                <ChevronsDownUp className="size-4" />
              )}
              {todosRecolhidos ? 'Expandir todas' : 'Recolher todas'}
            </button>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">{caption}</caption>

            <thead>
              <tr className="bg-table-head">
                <th
                  scope="col"
                  className="sticky left-0 z-20 border-b border-border bg-table-head px-5 py-3.5 text-left text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase"
                >
                  Posição · disponíveis por culto
                </th>
                {days.map((day) => (
                  <th
                    key={day.key}
                    scope="col"
                    className="min-w-[72px] border-b border-border px-1.5 py-2.5 text-center font-normal"
                  >
                    <span className="block text-[11px] font-semibold text-muted-foreground uppercase">
                      {day.weekday}
                    </span>
                    <span
                      className={cn(
                        'tabular block text-lg leading-tight font-semibold',
                        day.note && 'text-faint',
                      )}
                    >
                      {day.day}
                    </span>
                    <span className="block h-4 max-w-[72px] truncate text-[11px] text-muted-foreground">
                      {day.note}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {filtrados.map((group) => {
              const aberto = termo !== '' || !recolhidos.has(group.role)

              return (
                <tbody key={group.role}>
                  <tr>
                    <th
                      scope="rowgroup"
                      className="sticky left-0 z-10 border-b border-divider bg-card px-3 py-2 text-left font-normal"
                    >
                      <button
                        type="button"
                        aria-expanded={aberto}
                        onClick={() => setRecolhidos((s) => alternar(s, group.role))}
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left whitespace-nowrap hover:bg-tray focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <ChevronRight
                          className={cn(
                            'size-4 text-muted-foreground transition-transform',
                            aberto && 'rotate-90',
                          )}
                        />
                        <span className="text-[15px] font-semibold">{group.label}</span>
                        <span className="text-[13px] text-muted-foreground">
                          {group.needed} por culto · {group.members.length}{' '}
                          {group.members.length === 1 ? 'pessoa' : 'pessoas'}
                        </span>
                      </button>
                    </th>

                    {days.map((day) => {
                      const livres = disponiveis.get(`${group.role}:${day.key}`) ?? 0
                      const status = statusOf(livres, group.needed, !!day.note)

                      return (
                        <td key={day.key} className="border-b border-divider p-1.5 text-center">
                          <span
                            title={`${livres} disponíveis para ${group.label}`}
                            className={cn(
                              'tabular inline-flex h-8 min-w-11 items-center justify-center rounded-lg border px-2 text-sm font-semibold',
                              STATUS_CLASS[status],
                            )}
                          >
                            {status === 'off' ? '—' : livres}
                          </span>
                        </td>
                      )
                    })}
                  </tr>

                  {aberto &&
                    group.members.map((member) => (
                      <tr key={`${group.role}:${member.id}`} className="bg-table-head">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 border-b border-divider bg-table-head py-1.5 pr-3 pl-[52px] text-left text-sm font-medium whitespace-nowrap"
                        >
                          {member.name}
                        </th>

                        {days.map((day) => {
                          const naoPode = marcados.has(`${member.id}:${day.key}`)

                          return (
                            <td key={day.key} className="border-b border-divider px-1.5 py-1 text-center">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={naoPode}
                                aria-label={`${member.name} não pode em ${day.day}`}
                                onClick={() => definir(member.id, day.key, !naoPode)}
                                className={cn(
                                  'inline-flex h-8 w-11 items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                  naoPode
                                    ? 'border-destructive/70 bg-danger-soft text-destructive'
                                    : 'border-border bg-card text-success hover:border-rule-strong',
                                  day.note && !naoPode && 'text-faint',
                                )}
                              >
                                {naoPode ? (
                                  <X className="size-3.5" strokeWidth={2.4} />
                                ) : (
                                  <Check className="size-3.5" strokeWidth={2.4} />
                                )}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                </tbody>
              )
            })}
          </table>

          {filtrados.length === 0 && (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              Ninguém com esse nome. Confira em Integrantes.
            </p>
          )}
        </div>

        <p
          aria-live="polite"
          className="border-t border-divider px-5 py-3.5 text-[13px] text-muted-foreground"
        >
          {total === 0
            ? 'Ninguém marcado neste mês.'
            : `${total} ${total === 1 ? 'ausência marcada' : 'ausências marcadas'} neste mês.`}{' '}
          Clique em um dia de alguém para marcar que não pode.
        </p>
      </section>

      <div className="flex flex-col gap-3 md:hidden">
        <div
          role="group"
          aria-label="Escolher data"
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
        >
          {days.map((day) => {
            const ativo = day.key === dia?.key
            const temAusencia = groups.some((g) =>
              g.members.some((m) => marcados.has(`${m.id}:${day.key}`)),
            )

            return (
              <button
                key={day.key}
                type="button"
                aria-pressed={ativo}
                onClick={() => setDiaSelecionado(day.key)}
                className={cn(
                  'flex min-h-16 w-[54px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-tile border',
                  ativo
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground',
                  day.note && !ativo && 'opacity-45',
                )}
              >
                <span className="text-[11px] font-semibold uppercase">{day.weekday}</span>
                <span className="tabular text-lg leading-tight font-semibold">{day.day}</span>
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    temAusencia ? (ativo ? 'bg-danger-border' : 'bg-destructive') : 'bg-transparent',
                  )}
                />
              </button>
            )
          })}
        </div>

        {dia && (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[17px] font-semibold">{dia.title}</h2>
              <span className="shrink-0 text-[13px] text-muted-foreground">
                {ausentesNoDia === 0
                  ? 'Nenhuma ausência'
                  : `${ausentesNoDia} ${ausentesNoDia === 1 ? 'ausência' : 'ausências'}`}
              </span>
            </div>

            {dia.note && (
              <p className="stripes rounded-tile border border-border px-4 py-3 text-sm text-subtle">
                {dia.note} · ninguém escalado neste dia.
              </p>
            )}

            <ul className="overflow-hidden rounded-card border border-border bg-card">
              {groups.map((group) => {
                const livres = disponiveis.get(`${group.role}:${dia.key}`) ?? 0
                const status = statusOf(livres, group.needed, !!dia.note)
                const aberto = abertosNoDia.has(group.role)

                return (
                  <li key={group.role} className="border-b border-divider last:border-0">
                    <button
                      type="button"
                      aria-expanded={aberto}
                      onClick={() => setAbertosNoDia((s) => alternar(s, group.role))}
                      className="flex min-h-14 w-full items-center gap-2.5 px-3.5 text-left"
                    >
                      <ChevronRight
                        className={cn(
                          'size-4 text-muted-foreground transition-transform',
                          aberto && 'rotate-90',
                        )}
                      />
                      <span className="flex flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-semibold">{group.label}</span>
                        <span className="text-xs text-muted-foreground">
                          precisa de {group.needed}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'tabular inline-flex h-[30px] min-w-16 items-center justify-center rounded-lg border px-2.5 text-[13px] font-semibold',
                          STATUS_CLASS[status],
                        )}
                      >
                        {status === 'off'
                          ? '—'
                          : status === 'falta'
                            ? `${livres} de ${group.needed}`
                            : status === 'justo'
                              ? 'sem reserva'
                              : `${livres} livres`}
                      </span>
                    </button>

                    {aberto && (
                      <ul className="flex flex-col pr-3.5 pb-2.5 pl-10">
                        {group.members.map((member) => {
                          const naoPode = marcados.has(`${member.id}:${dia.key}`)

                          return (
                            <li
                              key={member.id}
                              className="flex min-h-12 items-center gap-2.5 border-t border-background"
                            >
                              <span className="flex-1 text-[15px]">{member.name}</span>
                              <button
                                type="button"
                                aria-pressed={naoPode}
                                aria-label={`${member.name} ${naoPode ? 'não pode' : 'pode'} em ${dia.day}`}
                                onClick={() => definir(member.id, dia.key, !naoPode)}
                                className={cn(
                                  'flex min-h-11 min-w-[104px] items-center justify-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-semibold',
                                  naoPode
                                    ? 'border-destructive/70 bg-danger-soft text-destructive'
                                    : 'border-border bg-card text-success',
                                )}
                              >
                                {naoPode ? (
                                  <X className="size-3.5" strokeWidth={2.4} />
                                ) : (
                                  <Check className="size-3.5" strokeWidth={2.4} />
                                )}
                                {naoPode ? 'Não pode' : 'Pode'}
                              </button>
                            </li>
                          )
                        })}
                        {group.members.length === 0 && (
                          <li className="min-h-12 border-t border-background py-3 text-sm text-muted-foreground">
                            Ninguém cadastrado nesta posição.
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </>
  )
}

function Legenda({ status, texto }: { status: Status; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-3 rounded-[4px] border', STATUS_CLASS[status])} />
      {texto}
    </span>
  )
}
