import ExcelJS from 'exceljs'
import { HEADER_COLOR } from '@/lib/domain/types'
import { HEADERS, rowValues, type ExportSchedule } from './rows'

/** ExcelJS quer ARGB sem `#`; o alfa e sempre opaco. */
function argb(hex: string): string {
  return `FF${hex.replace('#', '').toUpperCase()}`
}

const THIN: ExcelJS.Border = { style: 'thin', color: { argb: 'FF000000' } }

/** Larguras calibradas para as colunas caberem sem cortar os nomes. */
const COLUMN_WIDTHS = [14, 16, 18, 30, 18, 18, 20, 14, 26, 12]

function paint(cell: ExcelJS.Cell, color: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(color) } }
  cell.border = { top: THIN, left: THIN, bottom: THIN, right: THIN }
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
}

/**
 * Gera o .xlsx com a mesma aparencia da planilha do Google Sheets: cabecalho
 * lilas, cada linha pintada com a cor do seu time e a coluna TIME na lateral.
 */
export async function toXlsxBuffer(schedule: ExportSchedule): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Escala de Louvor'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(
    `${String(schedule.month).padStart(2, '0')}-${schedule.year}`,
  )

  sheet.columns = COLUMN_WIDTHS.map((width) => ({ width }))

  const header = sheet.addRow(HEADERS)
  header.height = 28
  header.eachCell((cell) => {
    paint(cell, HEADER_COLOR)
    cell.font = { bold: true, size: 12, color: { argb: 'FF000000' } }
  })

  for (const row of schedule.rows) {
    const excelRow = sheet.addRow(rowValues(row))
    excelRow.height = 24

    excelRow.eachCell((cell, colNumber) => {
      paint(cell, row.teamColor)

      // DATA e DIA saem so em negrito; os nomes, em negrito italico.
      const isDateOrDay = colNumber <= 2
      cell.font = {
        bold: true,
        italic: !isDateOrDay,
        size: 11,
        color: { argb: 'FF000000' },
      }

      // A data vai como texto para o Excel nao reinterpretar dd/mm conforme o
      // locale de quem abrir o arquivo.
      if (colNumber === 1) cell.numFmt = '@'
    })
  }

  return workbook.xlsx.writeBuffer()
}
