'use client'

import { useTransition } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generateScheduleAction } from '@/app/actions'

export function GenerateButton({
  year,
  month,
  hasSchedule,
}: {
  year: number
  month: number
  hasSchedule: boolean
}) {
  const [pending, startTransition] = useTransition()

  const run = () =>
    startTransition(async () => {
      try {
        const { warnings } = await generateScheduleAction(year, month)

        if (warnings.length === 0) {
          toast.success('Escala gerada.')
        } else {
          toast.warning(
            `Escala gerada com ${warnings.length} ${
              warnings.length === 1 ? 'pendência' : 'pendências'
            }.`,
          )
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível gerar.')
      }
    })

  return (
    <Button onClick={run} disabled={pending}>
      <RefreshCw className={pending ? 'animate-spin' : undefined} />
      {pending ? 'Gerando…' : hasSchedule ? 'Gerar de novo' : 'Gerar escala'}
    </Button>
  )
}
