import { NextResponse, type NextRequest } from 'next/server'
import { buildExportSchedule } from '@/lib/export/rows'
import { toCsv } from '@/lib/export/csv'
import { toXlsxBuffer } from '@/lib/export/xlsx'
import { loadMembers, loadSchedule, loadTeams } from '@/server/queries'

const XLSX_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Baixa a escala do mes como .xlsx (com as cores) ou .csv (texto puro). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const year = Number(params.get('year'))
  const month = Number(params.get('month'))
  const format = params.get('format') === 'csv' ? 'csv' : 'xlsx'

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Mês inválido.' }, { status: 400 })
  }

  const [stored, members, teams] = await Promise.all([
    loadSchedule(year, month),
    loadMembers(),
    loadTeams(),
  ])

  if (!stored) {
    return NextResponse.json({ error: 'Não há escala para este mês.' }, { status: 404 })
  }

  const schedule = buildExportSchedule({
    year,
    month,
    entries: stored.entries,
    members,
    teams,
  })

  if (format === 'csv') {
    return new NextResponse(toCsv(schedule), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${schedule.fileName}.csv"`,
      },
    })
  }

  const buffer = await toXlsxBuffer(schedule)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': XLSX_TYPE,
      'Content-Disposition': `attachment; filename="${schedule.fileName}.xlsx"`,
    },
  })
}
