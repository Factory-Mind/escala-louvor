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
    'flex size-10 shrink-0 items-center justify-center rounded-[10px] text-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:size-11 md:border md:border-border md:bg-card md:hover:border-rule-strong md:hover:bg-card'

  return (
    <div className="-ml-2.5 flex items-center gap-1 md:ml-0 md:gap-2">
      <button type="button" className={seta} onClick={() => go(-1)} aria-label="Mês anterior">
        <ChevronLeft className="size-[18px]" />
      </button>

      <h1 className="text-[22px] font-semibold tracking-[-0.02em] capitalize md:mx-2 md:text-[32px] md:leading-tight">
        {monthName(month)} {year}
      </h1>

      <button type="button" className={seta} onClick={() => go(1)} aria-label="Próximo mês">
        <ChevronRight className="size-[18px]" />
      </button>
    </div>
  )
}
