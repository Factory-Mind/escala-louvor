import { describe, expect, it } from 'vitest'
import { ROLES, type Role } from '@/lib/domain/types'
import { generateSchedule, unavailableKey, type GeneratedEntry } from './generate'
import { formation, makeInput, members as baseMembers, teams } from './fixtures'
import { formatDate } from './serviceDays'

const AUG_2 = new Date(Date.UTC(2026, 7, 2)) // domingo
const AUG_5 = new Date(Date.UTC(2026, 7, 5)) // quarta
const AUG_19 = new Date(Date.UTC(2026, 7, 19)) // quarta

type Schedule = ReturnType<typeof generateSchedule>

function cells(entry: GeneratedEntry, role: Role) {
  return entry.assignments
    .filter((a) => a.role === role)
    .sort((a, b) => a.position - b.position)
    .map((a) => a.memberId)
}

function at(schedule: Schedule, order: number, role: Role) {
  return cells(schedule.entries.find((e) => e.order === order)!, role)
}

/** Assinatura da escalacao de uma linha, para comparar dias entre si. */
function lineup(entry: GeneratedEntry) {
  return entry.assignments
    .map((a) => `${a.role}${a.position}=${a.memberId}`)
    .sort()
    .join(' ')
}

describe('generateSchedule — estrutura', () => {
  it('gera as 14 linhas de agosto/2026 nas datas da planilha', () => {
    const { entries } = generateSchedule(makeInput())

    expect(entries).toHaveLength(14)
    expect(formatDate(entries[0].date)).toBe('02/08/2026')
    expect(formatDate(entries[13].date)).toBe('30/08/2026')
  })

  it('escala a quantidade de gente que a formacao pede', () => {
    const { entries } = generateSchedule(makeInput())

    for (const entry of entries) {
      for (const role of ROLES) {
        expect(cells(entry, role)).toHaveLength(formation[role])
      }
    }
  })

  it('respeita uma formacao diferente da padrao', () => {
    const schedule = generateSchedule(
      makeInput({ formation: { ...formation, VOCAL_FEM: 3 } }),
    )

    expect(at(schedule, 0, 'VOCAL_FEM')).toHaveLength(3)
  })

  it('nao deixa nenhum time preso so no domingo ou so na quarta', () => {
    const { entries } = generateSchedule(makeInput())
    const porDia = entries.filter((e) => e.service !== 'DOM_NOITE')

    for (const team of teams) {
      const dias = porDia.filter((e) => e.teamId === team.id)
      expect(dias.some((e) => e.service === 'QUARTA')).toBe(true)
      expect(dias.some((e) => e.service === 'DOM_MANHA')).toBe(true)
    }
  })
})

describe('generateSchedule — domingo', () => {
  it('escala as mesmas pessoas de manha e a noite', () => {
    const { entries } = generateSchedule(makeInput())

    const domingos = entries.filter((e) => e.service !== 'QUARTA')
    expect(domingos).toHaveLength(10)

    for (let i = 0; i < domingos.length; i += 2) {
      expect(domingos[i].service).toBe('DOM_MANHA')
      expect(domingos[i + 1].service).toBe('DOM_NOITE')
      expect(lineup(domingos[i + 1])).toBe(lineup(domingos[i]))
    }
  })

  it('usa o mesmo time nas duas linhas do domingo', () => {
    const { entries } = generateSchedule(makeInput())
    expect(entries[1].teamId).toBe(entries[0].teamId)
  })
})

describe('generateSchedule — rodizio de pessoas', () => {
  it('troca os vocais de um dia de culto para o outro', () => {
    const { entries } = generateSchedule(makeInput())

    const porDia = entries.filter((e) => e.service !== 'DOM_NOITE')
    const vocaisFem = new Set(porDia.map((e) => cells(e, 'VOCAL_FEM').join('/')))
    const vocaisMasc = new Set(porDia.map((e) => cells(e, 'VOCAL_MASC').join('/')))

    expect(vocaisFem.size).toBeGreaterThan(1)
    expect(vocaisMasc.size).toBeGreaterThan(1)
  })

  it('espalha as escalacoes entre quem toca o mesmo instrumento', () => {
    const { entries } = generateSchedule(makeInput())

    // conta por dia de culto, ja que domingo repete a mesma gente
    const porDia = entries.filter((e) => e.service !== 'DOM_NOITE')
    const vezes = new Map<string, number>()

    for (const entry of porDia) {
      for (const id of cells(entry, 'VOCAL_FEM')) {
        if (id) vezes.set(id, (vezes.get(id) ?? 0) + 1)
      }
    }

    const vocalistas = baseMembers.filter((m) => m.roles.includes('VOCAL_FEM'))
    // todas as seis entram, e a diferenca entre quem mais e quem menos canta e pequena
    expect(vezes.size).toBe(vocalistas.length)
    expect(Math.max(...vezes.values()) - Math.min(...vezes.values())).toBeLessThanOrEqual(2)
  })

  it('nunca escala a mesma pessoa duas vezes na mesma linha', () => {
    const { entries } = generateSchedule(makeInput())

    for (const entry of entries) {
      const ids = entry.assignments.map((a) => a.memberId).filter(Boolean)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('generateSchedule — disponibilidade', () => {
  it('nao escala quem avisou que nao pode', () => {
    const unavailable = new Set(
      members
        .filter((m) => m.roles.includes('VOCAL_FEM'))
        .slice(0, 2)
        .map((m) => unavailableKey(m.id, AUG_2)),
    )

    const schedule = generateSchedule(makeInput({ unavailable }))
    const escaladas = [...at(schedule, 0, 'VOCAL_FEM'), ...at(schedule, 1, 'VOCAL_FEM')]

    expect(escaladas).not.toContain('vf1')
    expect(escaladas).not.toContain('vf2')
  })

  it('so afeta a data marcada', () => {
    const schedule = generateSchedule(
      makeInput({ unavailable: new Set([unavailableKey('gt1', AUG_2)]) }),
    )

    expect(at(schedule, 0, 'GUITARRA')).toEqual(['gt2'])
    // na quarta seguinte BRENO volta a ser sorteavel
    expect(at(schedule, 2, 'GUITARRA')).toEqual(['gt1'])
  })

  it('ignora integrantes inativos', () => {
    const schedule = generateSchedule(
      makeInput({
        members: members.map((m) => (m.id === 'gt2' ? { ...m, active: false } : m)),
      }),
    )

    for (const entry of schedule.entries) {
      expect(cells(entry, 'GUITARRA')).not.toContain('gt2')
    }
  })

  it('marca A DEFINIR e avisa quando falta gente do instrumento', () => {
    const unavailable = new Set([
      unavailableKey('gt1', AUG_2),
      unavailableKey('gt2', AUG_2),
    ])
    const schedule = generateSchedule(makeInput({ unavailable }))

    expect(at(schedule, 0, 'GUITARRA')).toEqual([null])
    expect(schedule.warnings).toContainEqual(
      expect.objectContaining({ order: 0, role: 'GUITARRA' }),
    )
  })

  it('preenche o que da quando a formacao pede mais gente do que ha disponivel', () => {
    const unavailable = new Set(
      members
        .filter((m) => m.roles.includes('VOCAL_FEM'))
        .slice(0, 5)
        .map((m) => unavailableKey(m.id, AUG_5)),
    )

    // sobra uma vocalista para duas vagas
    const escaladas = at(generateSchedule(makeInput({ unavailable })), 2, 'VOCAL_FEM')

    expect(escaladas.filter(Boolean)).toHaveLength(1)
    expect(escaladas.filter((id) => id === null)).toHaveLength(1)
  })
})

describe('generateSchedule — gestor', () => {
  it('marca exatamente um gestor por linha', () => {
    for (const entry of generateSchedule(makeInput()).entries) {
      expect(entry.assignments.filter((a) => a.isGestor)).toHaveLength(1)
    }
  })

  it('so marca quem tem a flag e esta escalado na linha', () => {
    const gestores = new Set(members.filter((m) => m.isGestor).map((m) => m.id))

    for (const entry of generateSchedule(makeInput()).entries) {
      const gestor = entry.assignments.find((a) => a.isGestor)!
      expect(gestores.has(gestor.memberId!)).toBe(true)
    }
  })

  it('mantem o mesmo gestor de manha e a noite', () => {
    const { entries } = generateSchedule(makeInput())
    const manha = entries[0].assignments.find((a) => a.isGestor)!
    const noite = entries[1].assignments.find((a) => a.isGestor)!

    expect(noite.memberId).toBe(manha.memberId)
  })

  it('alterna o gestor ao longo do mes', () => {
    const porDia = generateSchedule(makeInput()).entries.filter(
      (e) => e.service !== 'DOM_NOITE',
    )
    const gestores = porDia.map((e) => e.assignments.find((a) => a.isGestor)?.memberId)

    expect(new Set(gestores).size).toBeGreaterThan(1)
  })

  it('troca uma vaga para garantir gestor quando o sorteio nao pegaria nenhum', () => {
    // DIGO e o unico gestor e divide o teclado com NINA: sem a troca, metade
    // dos cultos cairia sem responsavel
    const input = makeInput({
      members: members.map((m) => ({ ...m, isGestor: m.id === 'tec1' })),
    })

    for (const entry of generateSchedule(input).entries) {
      const gestor = entry.assignments.find((a) => a.isGestor)
      expect(gestor?.memberId).toBe('tec1')
    }
  })

  it('nao rouba uma celula travada para encaixar o gestor', () => {
    const primeira = generateSchedule(makeInput({ seed: 'a' }))
    const original = primeira.entries[0]
    const alterada = {
      ...original,
      assignments: original.assignments.map((a) =>
        a.role === 'TECLADO' ? { ...a, memberId: 'tec2', locked: true } : a,
      ),
    }

    const segunda = generateSchedule(
      makeInput({
        seed: 'b',
        previous: [alterada, ...primeira.entries.slice(1)],
        members: members.map((m) => ({ ...m, isGestor: m.id === 'tec1' })),
      }),
    )

    // NINA continua no teclado e o culto fica sem gestor, com aviso
    expect(at(segunda, 0, 'TECLADO')).toEqual(['tec2'])
    expect(segunda.warnings.some((w) => w.order === 0 && /gestor/i.test(w.message))).toBe(true)
  })

  it('avisa quando nenhum gestor foi escalado na linha', () => {
    const schedule = generateSchedule(
      makeInput({ members: members.map((m) => ({ ...m, isGestor: false })) }),
    )

    expect(schedule.entries[0].assignments.some((a) => a.isGestor)).toBe(false)
    expect(schedule.warnings.some((w) => /gestor/i.test(w.message))).toBe(true)
  })
})

describe('generateSchedule — travas', () => {
  it('preserva uma linha travada ao gerar de novo', () => {
    const primeira = generateSchedule(makeInput({ seed: 'a' }))
    const travada = { ...primeira.entries[0], locked: true }
    const previous = [travada, ...primeira.entries.slice(1)]

    const segunda = generateSchedule(makeInput({ seed: 'b', previous }))

    expect(segunda.entries[0].assignments).toEqual(travada.assignments)
    expect(segunda.entries[0].locked).toBe(true)
  })

  it('a noite acompanha a manha travada, para o domingo nao se dividir', () => {
    const primeira = generateSchedule(makeInput({ seed: 'a' }))
    const travada = { ...primeira.entries[0], locked: true }
    const previous = [travada, ...primeira.entries.slice(1)]

    const segunda = generateSchedule(makeInput({ seed: 'b', previous }))

    expect(lineup(segunda.entries[1])).toBe(lineup(travada))
    expect(segunda.entries[1].locked).toBe(false)
  })

  it('preserva uma celula travada e sorteia o resto da linha de novo', () => {
    const primeira = generateSchedule(makeInput({ seed: 'a' }))
    const original = primeira.entries[0]
    const alterada = {
      ...original,
      assignments: original.assignments.map((a) =>
        a.role === 'BAIXO' ? { ...a, memberId: 'bx3', locked: true } : a,
      ),
    }

    const segunda = generateSchedule(
      makeInput({ seed: 'b', previous: [alterada, ...primeira.entries.slice(1)] }),
    )

    expect(at(segunda, 0, 'BAIXO')).toEqual(['bx3'])
    expect(at(segunda, 1, 'BAIXO')).toEqual(['bx3'])
  })

  it('respeita a trava mesmo quando a pessoa ficou indisponivel', () => {
    const primeira = generateSchedule(makeInput({ seed: 'a' }))
    const travada = { ...primeira.entries[0], locked: true }
    const guitarrista = travada.assignments.find((a) => a.role === 'GUITARRA')!

    const segunda = generateSchedule(
      makeInput({
        seed: 'b',
        previous: [travada, ...primeira.entries.slice(1)],
        unavailable: new Set([unavailableKey(guitarrista.memberId!, AUG_2)]),
      }),
    )

    expect(at(segunda, 0, 'GUITARRA')).toEqual([guitarrista.memberId])
  })
})

describe('generateSchedule — aleatoriedade', () => {
  it('a mesma seed produz exatamente a mesma escala', () => {
    const a = generateSchedule(makeInput({ seed: 'igual' }))
    const b = generateSchedule(makeInput({ seed: 'igual' }))

    expect(b.entries).toEqual(a.entries)
  })

  it('cada clique em gerar produz uma escala diferente', () => {
    const escalas = new Set(
      ['s1', 's2', 's3', 's4', 's5', 's6'].map((seed) =>
        generateSchedule(makeInput({ seed })).entries.map(lineup).join(' | '),
      ),
    )

    expect(escalas.size).toBeGreaterThan(1)
  })
})

const members = baseMembers

function withMinistros(names: string[]) {
  return members.map((m) => ({ ...m, isMinistro: names.includes(m.name) }))
}

function dayOf(schedule: Schedule, date: string) {
  return schedule.entries.filter((e) => e.date.toISOString().slice(0, 10) === date)
}

function ids(entry: GeneratedEntry, role: Role) {
  return cells(entry, role).filter((id): id is string => !!id)
}

describe('generateSchedule — padrao domingo e quarta do mesmo time', () => {
  it('a quarta repete a escalacao do domingo do mesmo time quando todos estao livres', () => {
    const schedule = generateSchedule(makeInput({ seed: 'par' }))
    const domingo = dayOf(schedule, '2026-08-02')[0]
    const quarta = dayOf(schedule, '2026-08-19')[0]

    expect(quarta.teamId).toBe(domingo.teamId)
    expect(lineup(quarta)).toBe(lineup(domingo))
  })

  it('substitui so quem esta indisponivel na quarta', () => {
    const base = generateSchedule(makeInput({ seed: 'par' }))
    const domingo = dayOf(base, '2026-08-02')[0]
    const baixista = cells(domingo, 'BAIXO')[0]!

    const schedule = generateSchedule(
      makeInput({
        seed: 'par',
        unavailable: new Set([unavailableKey(baixista, AUG_19)]),
      }),
    )
    const quarta = dayOf(schedule, '2026-08-19')[0]

    expect(cells(quarta, 'BAIXO')[0]).not.toBe(baixista)
    expect(cells(quarta, 'GUITARRA')).toEqual(cells(domingo, 'GUITARRA'))
    expect(cells(quarta, 'BATERIA')).toEqual(cells(domingo, 'BATERIA'))
  })
})

describe('generateSchedule — ministro', () => {
  it('garante um ministro em cada naipe vocal', () => {
    const { entries } = generateSchedule(
      makeInput({ members: withMinistros(['HENRY', 'GI']), seed: 'min' }),
    )
    const ministros = new Set(['vm1', 'vf1'])

    for (const entry of entries) {
      expect(ids(entry, 'VOCAL_MASC').some((id) => ministros.has(id))).toBe(true)
      expect(ids(entry, 'VOCAL_FEM').some((id) => ministros.has(id))).toBe(true)
    }
  })

  it('nao acrescenta ninguem quando o naipe ja tem ministro, mesmo com duas ministras', () => {
    const { entries } = generateSchedule(
      makeInput({
        members: withMinistros(['HENRY', 'KALEB', 'ELDES', 'GABRIEL', 'GI', 'LARISSA', 'REBECA', 'AMANDA', 'MANU', 'FLOR']),
        seed: 'min',
      }),
    )

    for (const entry of entries) {
      expect(cells(entry, 'VOCAL_FEM')).toHaveLength(formation.VOCAL_FEM)
      expect(cells(entry, 'VOCAL_MASC')).toHaveLength(formation.VOCAL_MASC)
    }
  })

  it('avisa quando o unico ministro esta indisponivel', () => {
    const unavailable = new Set(
      Array.from({ length: 31 }, (_, i) =>
        unavailableKey('vm1', new Date(Date.UTC(2026, 7, i + 1))),
      ),
    )

    const { warnings } = generateSchedule(
      makeInput({ members: withMinistros(['HENRY']), unavailable, seed: 'min' }),
    )

    expect(warnings.some((w) => w.role === 'VOCAL_MASC' && /ministro/i.test(w.message))).toBe(true)
  })

  it('mantem o total de vocais da formacao: ministro masc extra tira uma vocal', () => {
    const { entries } = generateSchedule(
      makeInput({ members: withMinistros(['HENRY', 'GI']), seed: 'limite' }),
    )
    const limite = formation.VOCAL_MASC + formation.VOCAL_FEM

    for (const entry of entries) {
      const masc = ids(entry, 'VOCAL_MASC')
      const fem = ids(entry, 'VOCAL_FEM')

      expect(masc.length + fem.length).toBeLessThanOrEqual(limite)
      expect(masc.length).toBeGreaterThanOrEqual(1)
      expect(fem.length).toBeGreaterThanOrEqual(1)
      if (masc.length === 2) expect(fem).toHaveLength(1)
    }
  })

  it('nao avisa nada quando ninguem esta marcado como ministro', () => {
    const { warnings } = generateSchedule(makeInput())
    expect(warnings.some((w) => /ministro/i.test(w.message))).toBe(false)
  })
})

describe('generateSchedule — dias de excecao', () => {
  const excecoes = new Map([['2026-08-16', { kind: 'LOUVOR_EXTERNO' as const, label: null }]])

  it('mantem o time do rodizio no dia, mas sem escalacao', () => {
    const schedule = generateSchedule(makeInput({ exceptions: excecoes }))
    const dia = dayOf(schedule, '2026-08-16')

    expect(dia).toHaveLength(2)
    for (const entry of dia) {
      expect(entry.teamId).not.toBeNull()
      expect(entry.assignments).toEqual([])
      expect(entry.exception?.kind).toBe('LOUVOR_EXTERNO')
    }
  })

  it('nao gera aviso para o dia e mantem os outros dias', () => {
    const schedule = generateSchedule(makeInput({ exceptions: excecoes }))

    expect(schedule.entries).toHaveLength(14)
    expect(schedule.warnings.filter((w) => w.date.toISOString().startsWith('2026-08-16'))).toEqual([])
    expect(dayOf(schedule, '2026-08-19')[0].teamId).not.toBeNull()
  })
})

describe('generateSchedule — pessoas adicionadas na mao', () => {
  it('mantem uma vaga extra travada de qualquer instrumento ao regerar', () => {
    const base = generateSchedule(makeInput({ seed: 'manual' }))
    const domingo = base.entries[0]
    const extra = members.find((m) => m.roles.includes('BAIXO') && !ids(domingo, 'BAIXO').includes(m.id))!

    const previous = base.entries.map((entry) =>
      entry.order === domingo.order
        ? {
            ...entry,
            assignments: [
              ...entry.assignments,
              { role: 'BAIXO' as const, position: 1, memberId: extra.id, isGestor: false, locked: true },
            ],
          }
        : entry,
    )

    const regerada = generateSchedule(makeInput({ seed: 'outra', previous }))

    expect(ids(regerada.entries[0], 'BAIXO')).toContain(extra.id)
    expect(cells(regerada.entries[0], 'BAIXO')).toHaveLength(2)
  })
})
