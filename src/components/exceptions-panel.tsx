'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  EXCEPTION_KINDS,
  EXCEPTION_KIND_OPTIONS,
  exceptionText,
  type ExceptionKind,
} from '@/lib/domain/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  className?: string
}

const selectClass =
  'h-11 w-full rounded-[10px] border border-input bg-card px-3 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ExceptionsPanel({ exceptions, days, className }: Props) {
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
  const livres = days.filter((d) => !usados.has(d.dateKey))
  const selecionado = livres.some((d) => d.dateKey === date) ? date : (livres[0]?.dateKey ?? '')

  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          'inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-dashed border-rule-strong bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          className,
        )}
      >
        <Plus className="size-4" />
        Marcar dia especial
        {exceptions.length > 0 && (
          <span className="tabular rounded-full bg-secondary px-1.5 text-xs text-muted-foreground">
            {exceptions.length}
          </span>
        )}
      </DialogTrigger>

      <DialogContent className={cn('gap-5 p-5 sm:max-w-md', pending && 'opacity-70')}>
        <DialogHeader>
          <DialogTitle className="text-lg">Dias sem escala do time</DialogTitle>
          <DialogDescription>
            Eventos, ou cultos com louvor convidado, ficam sem ninguém escalado. Depois de mudar,
            gere a escala do mês de novo para aplicar.
          </DialogDescription>
        </DialogHeader>

        {exceptions.length > 0 && (
          <ul className="divide-y divide-divider rounded-tile border border-border">
            {exceptions.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-1 pr-1 pl-3.5 text-sm">
                <span className="tabular font-medium">{item.date}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {exceptionText(item.kind, item.label)}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${item.date}`}
                  onClick={() => run(() => deleteExceptionAction(item.id), 'Dia removido.')}
                  className="flex size-10 items-center justify-center rounded-lg text-faint hover:bg-secondary hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="excecao-dia">Dia</Label>
            <select
              id="excecao-dia"
              value={selecionado}
              onChange={(e) => setDate(e.target.value)}
              className={selectClass}
            >
              {livres.map((d) => (
                <option key={d.dateKey} value={d.dateKey}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="excecao-tipo">Tipo</Label>
            <select
              id="excecao-tipo"
              value={kind}
              onChange={(e) => setKind(e.target.value as ExceptionKind)}
              className={selectClass}
            >
              {EXCEPTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EXCEPTION_KIND_OPTIONS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="excecao-nome">Nome do evento</Label>
            <Input
              id="excecao-nome"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Opcional"
              className="h-11 rounded-[10px] bg-card px-3"
            />
          </div>
        </div>

        <Button
          size="lg"
          disabled={!selecionado || pending}
          onClick={() =>
            run(async () => {
              await saveExceptionAction(selecionado, kind, label || null)
              setLabel('')
            }, 'Dia marcado.')
          }
        >
          Marcar dia
        </Button>
      </DialogContent>
    </Dialog>
  )
}
