import { describe, expect, it } from 'vitest'
import { summarizeUsage } from './summary'

const now = new Date('2026-10-10T12:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000)

describe('summarizeUsage', () => {
  it('conta por janela de 7 e 30 dias', () => {
    const summary = summarizeUsage(
      [
        { type: 'LOGIN', createdAt: daysAgo(1) },
        { type: 'LOGIN', createdAt: daysAgo(10) },
        { type: 'SCHEDULE_DOWNLOADED', createdAt: daysAgo(6) },
        { type: 'SCHEDULE_GENERATED', createdAt: daysAgo(40) },
      ],
      [],
      now,
    )

    expect(summary.last7).toEqual({ LOGIN: 1, SCHEDULE_GENERATED: 0, SCHEDULE_DOWNLOADED: 1 })
    expect(summary.last30).toEqual({ LOGIN: 2, SCHEDULE_GENERATED: 0, SCHEDULE_DOWNLOADED: 1 })
  })

  it('agrupa os últimos 6 meses, do mais recente ao mais antigo', () => {
    const summary = summarizeUsage(
      [
        { type: 'SCHEDULE_GENERATED', createdAt: new Date('2026-10-01T00:00:00Z') },
        { type: 'SCHEDULE_GENERATED', createdAt: new Date('2026-08-15T00:00:00Z') },
        { type: 'SCHEDULE_GENERATED', createdAt: new Date('2026-03-15T00:00:00Z') },
      ],
      [],
      now,
    )

    expect(summary.byMonth.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2026-10', '2026-9', '2026-8', '2026-7', '2026-6', '2026-5',
    ])
    expect(summary.byMonth[0].counts.SCHEDULE_GENERATED).toBe(1)
    expect(summary.byMonth[2].counts.SCHEDULE_GENERATED).toBe(1)
    expect(summary.byMonth.reduce((t, m) => t + m.counts.SCHEDULE_GENERATED, 0)).toBe(2)
  })

  it('vira o ano corretamente', () => {
    const summary = summarizeUsage([], [], new Date('2027-02-01T00:00:00Z'))
    expect(summary.byMonth.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2027-2', '2027-1', '2026-12', '2026-11', '2026-10', '2026-9',
    ])
  })
})
