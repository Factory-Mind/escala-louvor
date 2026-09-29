'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, Search, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Role } from '@/lib/domain/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toggleUnavailabilityAction } from './actions'

export type Day = {
  key: string
  day: string
  weekday: string
  services: number
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
  /** Chaves `memberId:AAAA-MM-DD` de quem avisou que não pode. */
  unavailable: string[]
}

export function AvailabilityBoard({ caption, days, groups, unavailable }: Props) {
  const [, startTransition] = useTransition()
  const [busca, setBusca] = useState('')
  const [recolhidos, setRecolhidos] = useState<Set<Role>>(new Set())

  const alternarGrupo = (role: Role) =>
    setRecolhidos((atual) => {
      const next = new Set(atual)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })

  const todosRecolhidos = recolhidos.size === groups.length
  const alternarTodos = () =>
    setRecolhidos(todosRecolhidos ? new Set() : new Set(groups.map((g) => g.role)))

  // A marcação responde na hora; o servidor confirma em seguida.
  const [marcados, marcar] = useOptimistic(
    new Set(unavailable),
    (state, { key, value }: { key: string; value: boolean }) => {
      const next = new Set(state)
      if (value) next.add(key)
      else next.delete(key)
      return next
    },
  )

  const alternar = (memberId: string, day: string, value: boolean) =>
    startTransition(async () => {
      marcar({ key: `${memberId}:${day}`, value })

      try {
        await toggleUnavailabilityAction(memberId, day, value)
      } catch {
        toast.error('Não foi possível salvar a disponibilidade.')
      }
    })

  /** Quantas pessoas sobram em cada posição, dia a dia. */
  const disponiveis = useMemo(() => {
    const contagem = new Map<string, number>()

    for (const group of groups) {
      for (const day of days) {
        const livres = group.members.filter(
          (m) => !marcados.has(`${m.id}:${day.key}`),
        ).length
        contagem.set(`${group.role}:${day.key}`, livres)
      }
    }

    return contagem
  }, [groups, days, marcados])

  /** Posições que já não fecham — viram A DEFINIR na hora de gerar. */
  const faltas = useMemo(
    () =>
      groups.flatMap((group) =>
        days
          .filter((day) => (disponiveis.get(`${group.role}:${day.key}`) ?? 0) < group.needed)
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar integrante"
            aria-label="Buscar integrante"
            className="pl-9"
          />
        </div>

        <p aria-live="polite" className="text-sm text-muted-foreground">
          {total === 0
            ? 'Ninguém marcado neste mês.'
            : `${total} ${total === 1 ? 'marcação' : 'marcações'} neste mês.`}
        </p>

        <Button variant="ghost" size="sm" className="ml-auto" onClick={alternarTodos}>
          {todosRecolhidos ? <ChevronsUpDown /> : <ChevronsDownUp />}
          {todosRecolhidos ? 'Expandir todas' : 'Recolher todas'}
        </Button>
      </div>


      {faltas.length > 0 && (
        <div className="space-y-1.5 border-l-2 border-destructive py-1 pl-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <TriangleAlert className="size-4 shrink-0 text-destructive" />
            {faltas.length === 1
              ? 'Uma posição não fecha com as marcações de hoje'
              : `${faltas.length} posições não fecham com as marcações de hoje`}
          </p>
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            {faltas.slice(0, 6).map(({ group, day }) => (
              <li key={`${group.role}:${day.key}`}>
                <span className="tabular">
                  {day.day}/{day.weekday}
                </span>{' '}
                — {group.label}: {disponiveis.get(`${group.role}:${day.key}`)} de{' '}
                {group.needed}
              </li>
            ))}
            {faltas.length > 6 && <li>e mais {faltas.length - 6}.</li>}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{caption}</caption>

          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 w-40 bg-card pr-6 pb-3 text-left font-medium"
              >
                Integrante
              </th>

              {days.map((day) => (
                <th key={day.key} scope="col" className="px-1 pb-3 text-center font-normal">
                  <span className="tabular block text-base font-semibold">{day.day}</span>
                  <span className="block text-xs text-muted-foreground">{day.weekday}</span>
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
                    className="sticky left-0 z-10 bg-card pt-4 pr-6 pb-1 text-left"
                  >
                    <button
                      type="button"
                      aria-expanded={aberto}
                      onClick={() => alternarGrupo(group.role)}
                      className="-ml-1.5 flex items-center gap-1.5 rounded-md px-1.5 py-1 whitespace-nowrap hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <ChevronDown
                        className={cn(
                          'size-3.5 text-muted-foreground transition-transform',
                          !aberto && '-rotate-90',
                        )}
                      />
                      <span className="text-xs font-semibold">{group.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {group.needed} por culto · {group.members.length}{' '}
                        {group.members.length === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    </button>
                  </th>

                  {days.map((day) => {
                    const livres = disponiveis.get(`${group.role}:${day.key}`) ?? 0
                    const falta = livres < group.needed

                    return (
                      <td key={day.key} className="px-1 pt-4 pb-1 text-center">
                        <span
                          title={`${livres} disponíveis para ${group.label}`}
                          className={cn(
                            'tabular text-xs',
                            falta ? 'font-semibold text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {livres}
                        </span>
                      </td>
                    )
                  })}
                </tr>

                {aberto && group.members.map((member) => (
                  <tr key={`${group.role}:${member.id}`} className="group/row">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-card py-0.5 pr-6 text-left font-normal whitespace-nowrap group-hover/row:bg-secondary"
                    >
                      {member.name}
                    </th>

                    {days.map((day) => {
                      const key = `${member.id}:${day.key}`
                      const naoPode = marcados.has(key)

                      return (
                        <td
                          key={day.key}
                          className="px-1 py-0.5 text-center group-hover/row:bg-secondary"
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={naoPode}
                            aria-label={`${member.name} não pode em ${day.day}`}
                            onClick={() => alternar(member.id, day.key, !naoPode)}
                            className={cn(
                              'mx-auto flex size-7 items-center justify-center rounded-md border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                              naoPode
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-border bg-card hover:border-foreground/40 hover:bg-secondary',
                            )}
                          >
                            {naoPode && <X className="size-3.5" />}
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
          <p className="py-6 text-sm text-muted-foreground">
            Ninguém com esse nome. Confira em Integrantes.
          </p>
        )}
      </div>
    </div>
  )
}
