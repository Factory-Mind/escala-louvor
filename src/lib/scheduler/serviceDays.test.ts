import { describe, expect, it } from 'vitest'
import { buildServiceDays, flattenRows, formatDate } from './serviceDays'

describe('buildServiceDays', () => {
  it('reproduz agosto/2026 exatamente como a planilha atual', () => {
    const days = buildServiceDays(2026, 8)

    // 5 domingos (2, 9, 16, 23, 30) + 4 quartas (5, 12, 19, 26)
    expect(days).toHaveLength(9)
    expect(days.map((d) => formatDate(d.date))).toEqual([
      '02/08/2026',
      '05/08/2026',
      '09/08/2026',
      '12/08/2026',
      '16/08/2026',
      '19/08/2026',
      '23/08/2026',
      '26/08/2026',
      '30/08/2026',
    ])

    // 14 linhas no total: domingo gera 2, quarta gera 1
    expect(flattenRows(days)).toHaveLength(14)
  })

  it('domingo gera manha e noite, quarta gera uma linha so', () => {
    const days = buildServiceDays(2026, 8)

    expect(days[0].services).toEqual(['DOM_MANHA', 'DOM_NOITE'])
    expect(days[1].services).toEqual(['QUARTA'])
  })

  it('mantem as linhas em ordem cronologica com manha antes da noite', () => {
    const rows = flattenRows(buildServiceDays(2026, 8))

    expect(rows.slice(0, 4).map((r) => `${formatDate(r.date)} ${r.service}`)).toEqual([
      '02/08/2026 DOM_MANHA',
      '02/08/2026 DOM_NOITE',
      '05/08/2026 QUARTA',
      '09/08/2026 DOM_MANHA',
    ])
  })

  it('numera as linhas sequencialmente a partir de zero', () => {
    const rows = flattenRows(buildServiceDays(2026, 8))
    expect(rows.map((r) => r.order)).toEqual([...Array(14).keys()])
  })

  it('cobre meses que comecam e terminam em dia de culto', () => {
    // fevereiro/2026: 1, 8, 15, 22 sao domingos; 4, 11, 18, 25 sao quartas
    const days = buildServiceDays(2026, 2)
    expect(days.map((d) => formatDate(d.date))).toEqual([
      '01/02/2026',
      '04/02/2026',
      '08/02/2026',
      '11/02/2026',
      '15/02/2026',
      '18/02/2026',
      '22/02/2026',
      '25/02/2026',
    ])
  })

  it('nao vaza para o mes seguinte em fevereiro bissexto', () => {
    const days = buildServiceDays(2024, 2)
    const last = days[days.length - 1]

    // 29/02/2024 existe, mas cai numa quinta — o ultimo culto e a quarta 28/02
    expect(formatDate(last.date)).toBe('28/02/2024')
    expect(days.every((d) => d.date.getUTCMonth() === 1)).toBe(true)
  })
})
