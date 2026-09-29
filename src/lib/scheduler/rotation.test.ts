import { describe, expect, it } from 'vitest'
import { assignTeams, weekIndex, type RotationTeam, type ScheduledDay } from './rotation'
import { buildServiceDays } from './serviceDays'

const TEAMS: RotationTeam[] = [
  { id: 't1', name: 'TIME 1', color: '#ED7D31', order: 0 },
  { id: 't2', name: 'TIME 2', color: '#FFFF00', order: 1 },
  { id: 't3', name: 'TIME 3', color: '#66EE77', order: 2 },
  { id: 't4', name: 'TIME 4', color: '#3DA5F4', order: 3 },
]

/** Meses reais usados nas checagens de regra, incluindo virada de ano. */
const MESES: Array<[number, number]> = [
  [2026, 8],
  [2026, 9],
  [2026, 10],
  [2026, 11],
  [2026, 12],
  [2027, 1],
  [2027, 2],
]

function escalar(year: number, month: number, teams = TEAMS) {
  return assignTeams(buildServiceDays(year, month), teams)
}

function ehQuarta(day: ScheduledDay) {
  return day.services.includes('QUARTA')
}

describe('weekIndex', () => {
  it('vira a semana no domingo', () => {
    // 06/09/2026 e domingo; o sabado anterior ainda e a semana de tras
    expect(weekIndex(new Date(Date.UTC(2026, 8, 5)))).toBe(
      weekIndex(new Date(Date.UTC(2026, 7, 30))),
    )
    expect(weekIndex(new Date(Date.UTC(2026, 8, 6)))).toBe(
      weekIndex(new Date(Date.UTC(2026, 8, 5))) + 1,
    )
  })

  it('mantem domingo e a quarta seguinte na mesma semana', () => {
    expect(weekIndex(new Date(Date.UTC(2026, 8, 9)))).toBe(
      weekIndex(new Date(Date.UTC(2026, 8, 6))),
    )
  })
})

describe('assignTeams — regras do rodizio', () => {
  it('nao repete o time na quarta da mesma semana em que ele dobrou no domingo', () => {
    for (const [year, month] of MESES) {
      const porSemana = new Map<number, ScheduledDay[]>()

      for (const day of escalar(year, month)) {
        const semana = weekIndex(day.date)
        porSemana.set(semana, [...(porSemana.get(semana) ?? []), day])
      }

      for (const [semana, dias] of porSemana) {
        const domingo = dias.find((d) => !ehQuarta(d))
        const quarta = dias.find(ehQuarta)
        if (!domingo || !quarta) continue

        expect(
          quarta.team.id,
          `${month}/${year} semana ${semana}: ${domingo.team.name} dobrou no domingo e voltou na quarta`,
        ).not.toBe(domingo.team.id)
      }
    }
  })

  it('todo time que dobra no domingo faz ao menos uma quarta no mes', () => {
    for (const [year, month] of MESES) {
      const days = escalar(year, month)

      for (const team of TEAMS) {
        const dias = days.filter((d) => d.team.id === team.id)
        if (!dias.some((d) => !ehQuarta(d))) continue

        expect(
          dias.some(ehQuarta),
          `${month}/${year}: ${team.name} pegou domingo e nenhuma quarta`,
        ).toBe(true)
      }
    }
  })

  it('nenhum time fica preso num unico tipo de culto', () => {
    for (const [year, month] of MESES) {
      const days = escalar(year, month)

      for (const team of TEAMS) {
        const dias = days.filter((d) => d.team.id === team.id)
        expect(dias.some(ehQuarta), `${month}/${year}: ${team.name} sem quarta`).toBe(true)
        expect(dias.some((d) => !ehQuarta(d)), `${month}/${year}: ${team.name} sem domingo`).toBe(
          true,
        )
      }
    }
  })

  it('divide os domingos e as quartas por igual, com no maximo um de diferenca', () => {
    for (const [year, month] of MESES) {
      const days = escalar(year, month)

      for (const tipo of [true, false]) {
        const contagem = TEAMS.map(
          (t) => days.filter((d) => d.team.id === t.id && ehQuarta(d) === tipo).length,
        )
        expect(Math.max(...contagem) - Math.min(...contagem)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('deixa a quarta meia volta a frente do domingo da mesma semana', () => {
    const days = escalar(2026, 9)
    const domingo = days.find((d) => !ehQuarta(d))!
    const quarta = days.find((d) => ehQuarta(d) && weekIndex(d.date) === weekIndex(domingo.date))!

    const sequencia = [0, 2, 1, 3]
    const pos = sequencia.indexOf(domingo.team.order)
    expect(quarta.team.order).toBe(sequencia[(pos + 2) % sequencia.length])
  })
})

describe('assignTeams — padrao da planilha de agosto/2026', () => {
  it('reproduz a ordem dos times da imagem', () => {
    const esperado: Record<string, string> = {
      '2026-08-02': 'TIME 1',
      '2026-08-05': 'TIME 2',
      '2026-08-09': 'TIME 3',
      '2026-08-12': 'TIME 4',
      '2026-08-16': 'TIME 2',
      '2026-08-19': 'TIME 1',
      '2026-08-23': 'TIME 4',
      '2026-08-26': 'TIME 3',
      '2026-08-30': 'TIME 1',
    }

    const obtido = Object.fromEntries(
      escalar(2026, 8).map((d) => [d.date.toISOString().slice(0, 10), d.team.name]),
    )

    expect(obtido).toEqual(esperado)
  })
})

describe('assignTeams — continuidade', () => {
  it('encadeia de um mes para o outro sem precisar do mes anterior', () => {
    // a quarta 02/09 e da mesma semana do domingo 30/08, que foi gerado em agosto
    const agosto = escalar(2026, 8)
    const setembro = escalar(2026, 9)

    const domingo30 = agosto[agosto.length - 1]
    const quarta02 = setembro[0]

    expect(weekIndex(quarta02.date)).toBe(weekIndex(domingo30.date))
    expect(quarta02.team.id).not.toBe(domingo30.team.id)
  })

  it('gera o mesmo mes independente da ordem em que os meses foram gerados', () => {
    const direto = escalar(2027, 1).map((d) => d.team.id)
    escalar(2026, 12)
    expect(escalar(2027, 1).map((d) => d.team.id)).toEqual(direto)
  })
})

describe('assignTeams — basico', () => {
  it('domingo manha e noite herdam o mesmo time', () => {
    const domingo = escalar(2026, 8).find((d) => !ehQuarta(d))!

    expect(domingo.services).toEqual(['DOM_MANHA', 'DOM_NOITE'])
    expect(domingo.team).toBeDefined()
  })

  it('respeita a ordem declarada mesmo se os times vierem embaralhados', () => {
    const embaralhados = [TEAMS[2], TEAMS[0], TEAMS[3], TEAMS[1]]

    expect(escalar(2026, 8, embaralhados).map((d) => d.team.id)).toEqual(
      escalar(2026, 8).map((d) => d.team.id),
    )
  })

  it('funciona com um unico time', () => {
    const days = escalar(2026, 8, [TEAMS[0]])
    expect(new Set(days.map((d) => d.team.id))).toEqual(new Set(['t1']))
  })

  it('alterna domingo e quarta com dois times', () => {
    const days = escalar(2026, 9, TEAMS.slice(0, 2))
    const domingo = days.find((d) => !ehQuarta(d))!
    const quarta = days.find((d) => ehQuarta(d) && weekIndex(d.date) === weekIndex(domingo.date))!

    expect(quarta.team.id).not.toBe(domingo.team.id)
  })

  it('reclama quando nao ha nenhum time ativo', () => {
    expect(() => escalar(2026, 8, [])).toThrow(/nenhum time ativo/i)
  })
})
