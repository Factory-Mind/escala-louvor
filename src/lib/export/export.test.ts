import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { generateSchedule } from '@/lib/scheduler/generate'
import { makeInput, members, teams } from '@/lib/scheduler/fixtures'
import { buildExportSchedule, COLUMNS, HEADERS } from './rows'
import { toCsv } from './csv'
import { toXlsxBuffer } from './xlsx'

function build() {
  const { entries } = generateSchedule(makeInput({ seed: 'export' }))
  return buildExportSchedule({ year: 2026, month: 8, entries, members, teams })
}

/**
 * O time da primeira linha e escolhido pelo rodizio, nao pelo exportador.
 * Os testes de cor perguntam qual foi, em vez de fixar um nome — assim eles
 * continuam testando o export mesmo se a regra do rodizio mudar.
 */
const primeiroTime = teams.find(
  (t) => t.id === generateSchedule(makeInput({ seed: 'export' })).entries[0].teamId,
)!

/** #RRGGBB no formato AARRGGBB que o ExcelJS usa. */
const argb = (color: string) => `FF${color.slice(1).toUpperCase()}`

describe('buildExportSchedule', () => {
  it('monta uma linha por culto, na ordem da planilha', () => {
    const schedule = build()

    expect(schedule.rows).toHaveLength(14)
    expect(schedule.rows[0].date).toBe('02/08/2026')
    expect(schedule.rows[0].day).toBe('DOM MANHÃ')
    expect(schedule.rows[1].day).toBe('DOM NOITE')
    expect(schedule.rows[2].day).toBe('QUARTA')
  })

  it('junta os nomes da mesma celula com barra', () => {
    const schedule = build()
    expect(schedule.rows[0].cells.VOCAL_FEM).toMatch(/^[A-ZÁÊÃÇÕ]+\/[A-ZÁÊÃÇÕ]+$/)
  })

  it('cola o sufixo /GESTOR no responsavel do culto', () => {
    const schedule = build()

    for (const row of schedule.rows) {
      const texto = COLUMNS.map((c) => row.cells[c.key]).join(' ')
      expect(texto.match(/\/GESTOR/g)).toHaveLength(1)
    }
  })

  it('escreve A DEFINIR quando a vaga ficou vazia', () => {
    const { entries } = generateSchedule(
      makeInput({
        seed: 'x',
        members: members.map((m) => (m.roles.includes('TECLADO') ? { ...m, active: false } : m)),
      }),
    )
    const schedule = buildExportSchedule({ year: 2026, month: 8, entries, members, teams })

    expect(schedule.rows[0].cells.TECLADO).toBe('A DEFINIR')
  })

  it('leva o nome e a cor do time para a coluna lateral', () => {
    const schedule = build()

    expect(schedule.rows[0].teamName).toBe(primeiroTime.name)
    expect(schedule.rows[0].teamColor).toBe(primeiroTime.color)
  })

  it('junta som e projecao na mesma coluna, com o som primeiro', () => {
    const schedule = build()
    const som = new Set(members.filter((m) => m.roles.includes('SOM')).map((m) => m.name))
    const projecao = new Set(
      members.filter((m) => m.roles.includes('PROJECAO')).map((m) => m.name),
    )

    for (const row of schedule.rows) {
      const [primeiro, segundo] = row.cells.SOM_PROJECAO.replace('/GESTOR', '').split('/')
      expect(som.has(primeiro)).toBe(true)
      expect(projecao.has(segundo)).toBe(true)
    }
  })

  it('nomeia o arquivo pelo ano e mes', () => {
    expect(build().fileName).toBe('escala-louvor-2026-08')
  })
})

describe('toCsv', () => {
  it('comeca com BOM para o Excel nao quebrar os acentos', () => {
    expect(toCsv(build()).startsWith('﻿')).toBe(true)
  })

  it('usa ponto e virgula e o cabecalho da planilha', () => {
    const linhas = toCsv(build()).replace('﻿', '').split('\r\n')

    expect(linhas[0]).toBe(
      'DATA;DIA;VOCAIS MASC;VOCAIS FEM;TECLADO;BAIXO;GUITARRA;BATERIA;SOM/PROJEÇÃO;TIME',
    )
  })

  it('escreve uma linha por culto com a data formatada', () => {
    const linhas = toCsv(build()).replace('﻿', '').trim().split('\r\n')

    expect(linhas).toHaveLength(15) // cabecalho + 14 cultos
    expect(linhas[1]).toMatch(/^02\/08\/2026;DOM MANHÃ;/)
    expect(linhas[1].endsWith(`;${primeiroTime.name}`)).toBe(true)
  })

  it('protege celulas que contem o separador', () => {
    const schedule = build()
    schedule.rows[0].cells.VOCAL_MASC = 'FULANO; CICLANO'
    const primeira = toCsv(schedule).replace('﻿', '').split('\r\n')[1]

    expect(primeira).toContain('"FULANO; CICLANO"')
  })
})

describe('toXlsxBuffer', () => {
  async function load() {
    const buffer = await toXlsxBuffer(build())
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer)
    return wb.worksheets[0]
  }

  it('escreve o cabecalho da planilha com o fundo lilas', async () => {
    const ws = await load()

    expect(ws.getCell('A1').value).toBe('DATA')
    expect(ws.getCell('I1').value).toBe('SOM/PROJEÇÃO')
    expect((ws.getCell('A1').fill as ExcelJS.FillPattern).fgColor?.argb).toBe('FFCCC0DA')
    expect(ws.getCell('A1').font?.bold).toBe(true)
  })

  it('pinta cada linha com a cor do time', async () => {
    const ws = await load()
    const fill = ws.getCell('A2').fill as ExcelJS.FillPattern

    expect(fill.fgColor?.argb).toBe(argb(primeiroTime.color))
    expect(ws.getCell('A2').value).toBe('02/08/2026')
  })

  it('usa a mesma cor na coluna TIME da direita', async () => {
    const ws = await load()

    expect(ws.getCell('J2').value).toBe(primeiroTime.name)
    expect((ws.getCell('J2').fill as ExcelJS.FillPattern).fgColor?.argb).toBe(
      argb(primeiroTime.color),
    )
  })

  it('mantem domingo manha e noite com a mesma cor', async () => {
    const ws = await load()
    const manha = (ws.getCell('A2').fill as ExcelJS.FillPattern).fgColor?.argb
    const noite = (ws.getCell('A3').fill as ExcelJS.FillPattern).fgColor?.argb

    expect(noite).toBe(manha)
  })

  it('escreve a data como texto para o Excel nao reinterpretar o formato', async () => {
    const ws = await load()
    expect(typeof ws.getCell('A2').value).toBe('string')
  })

  it('poe borda em todas as celulas da tabela', async () => {
    const ws = await load()

    expect(ws.getCell('C5').border?.top?.style).toBeDefined()
    expect(ws.getCell('C5').border?.left?.style).toBeDefined()
  })

  it('deixa os nomes em negrito italico, como na planilha', async () => {
    const ws = await load()
    const nome = ws.getCell('C2')

    expect(nome.font?.bold).toBe(true)
    expect(nome.font?.italic).toBe(true)
  })

  it('gera 15 linhas: cabecalho mais os 14 cultos', async () => {
    const ws = await load()
    expect(ws.rowCount).toBe(15)
  })
})

describe('linhas de excecao', () => {
  it('exporta as celulas vazias com o time e a cor do rodizio', async () => {
    const { entries } = generateSchedule(
      makeInput({
        seed: 'export',
        exceptions: new Map([['2026-08-16', { kind: 'EM_ABERTO' as const, label: 'EVENTO' }]]),
      }),
    )
    const schedule = buildExportSchedule({ year: 2026, month: 8, entries, members, teams })
    const linha = schedule.rows.find((r) => r.date === '16/08/2026')!

    expect(Object.values(linha.cells).every((c) => c === '')).toBe(true)
    expect(linha.teamName).toBe('TIME 2')
    expect(linha.teamColor).toBe('#FFFF00')

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await toXlsxBuffer(schedule))
    const row = workbook.worksheets[0].getRow(schedule.rows.indexOf(linha) + 2)
    expect(row.getCell(HEADERS.length).value).toBe('TIME 2')
    expect(row.getCell(3).isMerged).toBe(false)
  })
})
