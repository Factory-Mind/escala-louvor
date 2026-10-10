export const USAGE_TYPES = ['LOGIN', 'SCHEDULE_GENERATED', 'SCHEDULE_DOWNLOADED'] as const

export type UsageType = (typeof USAGE_TYPES)[number]

export const USAGE_LABELS: Record<UsageType, string> = {
  LOGIN: 'Acessos',
  SCHEDULE_GENERATED: 'Escalas geradas',
  SCHEDULE_DOWNLOADED: 'Escalas baixadas',
}

type Counts = Record<UsageType, number>

export type RecentEvent = {
  id: string
  type: UsageType
  actor: 'ADMIN' | 'MEMBER'
  year: number | null
  month: number | null
  userAgent: string | null
  createdAt: Date
}

export type UsageSummary = {
  last7: Counts
  last30: Counts
  byMonth: Array<{ year: number; month: number; counts: Counts }>
  recent: RecentEvent[]
}

const DAY = 24 * 60 * 60 * 1000

function emptyCounts(): Counts {
  return { LOGIN: 0, SCHEDULE_GENERATED: 0, SCHEDULE_DOWNLOADED: 0 }
}

export function summarizeUsage(
  events: Array<{ type: UsageType; createdAt: Date }>,
  recent: RecentEvent[],
  now: Date,
): UsageSummary {
  const last7 = emptyCounts()
  const last30 = emptyCounts()

  const byMonth = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, counts: emptyCounts() }
  })

  for (const event of events) {
    const age = now.getTime() - event.createdAt.getTime()
    if (age >= 0 && age < 7 * DAY) last7[event.type]++
    if (age >= 0 && age < 30 * DAY) last30[event.type]++

    const bucket = byMonth.find(
      (m) => m.year === event.createdAt.getUTCFullYear() && m.month === event.createdAt.getUTCMonth() + 1,
    )
    if (bucket) bucket.counts[event.type]++
  }

  return { last7, last30, byMonth, recent }
}
