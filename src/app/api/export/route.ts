import { NextResponse, type NextRequest } from "next/server";
import { buildExportSchedule } from "@/lib/export/rows";
import { toXlsxBuffer } from "@/lib/export/xlsx";
import { recordEvent } from "@/server/events";
import { loadMembers, loadSchedule, loadTeams } from "@/server/queries";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Baixa a escala do mes como .xlsx, com as cores dos times. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const year = Number(params.get("year"));
  const month = Number(params.get("month"));

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Mês inválido." }, { status: 400 });
  }

  const [stored, members, teams] = await Promise.all([loadSchedule(year, month), loadMembers(), loadTeams()]);

  if (!stored) {
    return NextResponse.json({ error: "Não há escala para este mês." }, { status: 404 });
  }

  const schedule = buildExportSchedule({
    year,
    month,
    entries: stored.entries,
    members,
    teams,
  });

  const buffer = await toXlsxBuffer(schedule);
  await recordEvent("SCHEDULE_DOWNLOADED", { year, month });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": XLSX_TYPE,
      "Content-Disposition": `attachment; filename="${schedule.fileName}.xlsx"`,
    },
  });
}
