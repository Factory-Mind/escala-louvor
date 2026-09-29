'use client'

import { useState, useTransition } from 'react'
import { CalendarOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  EXCEPTION_KINDS,
  EXCEPTION_KIND_OPTIONS,
  exceptionText,
  type ExceptionKind,
} from '@/lib/domain/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { deleteExceptionAction, saveExceptionAction } from '@/app/exceptions-actions'

type Props = {
  exceptions: Array<{
    id: string
    dateKey: string
    date: string
    kind: ExceptionKind
    label: string | null
  }>
  days: Array<{ dateKey: string; label: string }>
}

const selectClass =
  'h-9 rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ExceptionsPanel({ exceptions, days }: Props) {
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(days[0]?.dateKey ?? '')
  const [kind, setKind] = useState<ExceptionKind>('EM_ABERTO')
  const [label, setLabel] = useState('')

  const run = (action: () => Promise<void>, sucesso: string) =>
    startTransition(async () => {
      try {
        await action()
        toast.success(sucesso)
      } catch {
        toast.error('Não foi possível salvar.')
      }
    })

  const usados = new Set(exceptions.map((e) => e.dateKey))

  return (
    <section className={cn('mb-6 rounded-2xl border border-border p-4 sm:p-5', pending && 'opacity-70')}>
      <h2 className="flex items-center gap-2.5 text-[15px] font-semibold">
        <CalendarOff className="size-[18px] text-faint" />
        Dias sem escala do time
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Eventos, ou cultos com louvor convidado, ficam sem ninguém escalado. Depois de mudar,
        gere a escala do mês de novo para aplicar.
      </p>

      {exceptions.length > 0 && (
        <ul className="mt-3 divide-y divide-border border-y border-border">
          {exceptions.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="tabular font-medium">{item.date}</span>
              <span className="text-muted-foreground">{exceptionText(item.kind, item.label)}</span>
              <button
                type="button"
                aria-label={`Remover ${item.date}`}
                onClick={() => run(() => deleteExceptionAction(item.id), 'Dia removido.')}
                className="ml-auto flex size-8 items-center justify-center rounded-md text-faint hover:bg-secondary hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Dia"
          className={selectClass}
        >
          {days
            .filter((d) => !usados.has(d.dateKey))
            .map((d) => (
              <option key={d.dateKey} value={d.dateKey}>
                {d.label}
              </option>
            ))}
        </select>

        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ExceptionKind)}
          aria-label="Tipo"
          className={selectClass}
        >
          {EXCEPTION_KINDS.map((k) => (
            <option key={k} value={k}>
              {EXCEPTION_KIND_OPTIONS[k]}
            </option>
          ))}
        </select>

        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nome do evento (opcional)"
          aria-label="Nome do evento"
          className="w-56"
        />

        <Button
          variant="outline"
          disabled={!date || usados.has(date)}
          onClick={() =>
            run(async () => {
              await saveExceptionAction(date, kind, label || null)
              setLabel('')
            }, 'Dia marcado.')
          }
        >
          Marcar dia
        </Button>
      </div>
    </section>
  )
}
