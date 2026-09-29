'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { monthLabel } from '@/lib/domain/months'

/**
 * Passa o mes pela query string.
 *
 * Na tela de escala o mes ja e o titulo da pagina, entao o seletor aparece so
 * com as setas (`showLabel={false}`) para o nome nao sair duas vezes.
 */
export function MonthPicker({
  year,
  month,
  showLabel = true,
}: {
  year: number
  month: number
  showLabel?: boolean
}) {
  const router = useRouter()

  const go = (delta: number) => {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1))
    router.push(`?year=${date.getUTCFullYear()}&month=${date.getUTCMonth() + 1}`)
  }

  const seta =
    'flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-rule-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

  return (
    <div className={cn('flex items-center', showLabel ? 'gap-2' : 'gap-1')}>
      <button type="button" className={seta} onClick={() => go(-1)} aria-label="Mês anterior">
        <ChevronLeft className="size-4" />
      </button>

      {showLabel && (
        <span className="min-w-40 text-center text-sm font-medium">
          {monthLabel(year, month)}
        </span>
      )}

      <button type="button" className={seta} onClick={() => go(1)} aria-label="Próximo mês">
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
