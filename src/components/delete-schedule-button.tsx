'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteScheduleAction } from '@/app/actions'

export function DeleteScheduleButton({
  year,
  month,
  label,
}: {
  year: number
  month: number
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const run = () =>
    startTransition(async () => {
      try {
        await deleteScheduleAction(year, month)
        setOpen(false)
        toast.success('Escala excluída.')
      } catch {
        toast.error('Não foi possível excluir a escala.')
      }
    })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            size="lg"
            variant="ghost"
            aria-label="Excluir escala"
            className="px-3 text-muted-foreground hover:text-destructive md:px-4"
          />
        }
      >
        <Trash2 />
        <span className="hidden md:inline">Excluir</span>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a escala de {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            Todas as linhas, trocas manuais e travas deste mês serão apagadas. A
            disponibilidade marcada continua salva.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={run} disabled={pending}>
            {pending ? 'Excluindo…' : 'Excluir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
