import { HEADERS, rowValues, type ExportSchedule } from './rows'

const SEPARATOR = ';' // padrao do Excel em pt-BR
const NEWLINE = '\r\n'
const BOM = '﻿' // sem isso o Excel abre os acentos quebrados

function escapeCell(value: string): string {
  if (!/[";\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

/** Mesma tabela do XLSX, sem cores — para quem preferir importar em outro lugar. */
export function toCsv(schedule: ExportSchedule): string {
  const lines = [HEADERS, ...schedule.rows.map(rowValues)].map((cells) =>
    cells.map(escapeCell).join(SEPARATOR),
  )

  return BOM + lines.join(NEWLINE) + NEWLINE
}
