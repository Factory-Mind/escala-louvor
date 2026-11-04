'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthName } from '@/lib/domain/months'

export function MonthPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter()

  const go = (delta: number) => {
    const date = new Date(Date.UTC(year, month - 1 + delta, 1))
    router.push(`?year=${date.getUTCFullYear()}&month=${date.getUTCMonth() + 1}`)
  }

  const seta =
    'flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-rule-strong hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:size-10'

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <button type="button" className={seta} onClick={() => go(-1)} aria-label="Mês anterior">
        <ChevronLeft className="size-[18px]" />
      </button>

      <h1 className="text-[24px] font-bold tracking-[-0.025em] capitalize md:mx-1 md:text-[38px] md:leading-tight">
        {monthName(month)} {year}
      </h1>

      <button type="button" className={seta} onClick={() => go(1)} aria-label="Próximo mês">
        <ChevronRight className="size-[18px]" />
      </button>
    </div>
  )
}
