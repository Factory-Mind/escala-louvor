import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Download, LogIn, RefreshCw, type LucideIcon } from 'lucide-react'
import { SESSION_COOKIE, getSessionRole } from '@/lib/auth/session'
import { monthLabel } from '@/lib/domain/months'
import { USAGE_LABELS, USAGE_TYPES, type UsageType } from '@/lib/usage/summary'
import { PageHeader } from '@/components/page-header'
import { loadUsageSummary } from '@/server/events'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Uso · Escala de Louvor',
  robots: { index: false, follow: false },
}

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const ICONS: Record<UsageType, LucideIcon> = {
  LOGIN: LogIn,
  SCHEDULE_GENERATED: RefreshCw,
  SCHEDULE_DOWNLOADED: Download,
}

const BAR_CLASS: Record<UsageType, string> = {
  LOGIN: 'bg-chart-1',
  SCHEDULE_GENERATED: 'bg-chart-2',
  SCHEDULE_DOWNLOADED: 'bg-chart-3',
}

const EVENT_LABELS: Record<UsageType, string> = {
  LOGIN: 'Acesso',
  SCHEDULE_GENERATED: 'Escala gerada',
  SCHEDULE_DOWNLOADED: 'Escala baixada',
}

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ todos?: string }>
}) {
  const role = await getSessionRole((await cookies()).get(SESSION_COOKIE)?.value)
  if (role !== 'admin') notFound()

  const includeAdmin = (await searchParams).todos === '1'
  const summary = await loadUsageSummary(includeAdmin)

  const meses = [...summary.byMonth].reverse()
  const maximo = Math.max(1, ...meses.flatMap((m) => USAGE_TYPES.map((t) => m.counts[t])))
  const descricaoGrafico = meses
    .map(
      ({ year, month, counts }) =>
        `${monthLabel(year, month)}: ${USAGE_TYPES.map((t) => `${counts[t]} ${USAGE_LABELS[t].toLowerCase()}`).join(', ')}`,
    )
    .join('; ')

  return (
    <>
      <PageHeader
        title="Uso do app"
        description={<span className="hidden md:inline">Quem está entrando e o que está sendo feito.</span>}
        actions={
          <Link
            href={includeAdmin ? '/uso' : '/uso?todos=1'}
            aria-label={includeAdmin ? 'Ocultar minhas ações' : 'Incluir minhas ações'}
            className="flex min-h-11 w-full items-center justify-between gap-2.5 text-[15px] md:w-auto md:justify-start md:rounded-[10px] md:border md:border-border md:bg-card md:px-3.5 md:text-sm"
          >
            <span className="md:order-2">Incluir minhas ações</span>
            <span
              aria-hidden
              className={cn(
                'flex h-7 w-12 items-center rounded-full p-[3px] transition-colors md:order-1 md:h-6 md:w-10',
                includeAdmin ? 'justify-end bg-primary' : 'justify-start bg-input',
              )}
            >
              <span className="size-[22px] rounded-full bg-card shadow-sm md:size-[18px]" />
            </span>
          </Link>
        }
      />

      <section
        aria-label="Últimos 7 dias"
        className="grid gap-2 md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] md:gap-3"
      >
        {USAGE_TYPES.map((type) => {
          const Icon = ICONS[type]

          return (
            <div
              key={type}
              className="flex items-center gap-3.5 rounded-tile border border-border bg-card px-4 py-3.5 md:items-start md:px-5 md:py-[18px]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-secondary text-subtle">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div className="flex flex-1 flex-col gap-0.5 md:gap-1">
                <span className="text-sm text-muted-foreground">{USAGE_LABELS[type]}</span>
                <span className="tabular hidden text-[30px] leading-tight font-semibold tracking-[-0.02em] md:block">
                  {summary.last7[type]}
                </span>
                <span className="tabular text-xs text-muted-foreground md:text-[13px]">
                  <span className="md:hidden">7 dias</span>
                  <span className="hidden md:inline">nos últimos 7 dias</span> ·{' '}
                  {summary.last30[type]} em 30 dias
                </span>
              </div>
              <span className="tabular text-[26px] font-semibold md:hidden">
                {summary.last7[type]}
              </span>
            </div>
          )
        })}
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="flex min-w-0 flex-col gap-3.5 rounded-card border border-border bg-card p-4 md:gap-[18px] md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px] font-semibold md:text-lg">Por mês</h2>
            <Legenda className="hidden md:flex" />
          </div>

          <div
            role="img"
            aria-label={descricaoGrafico}
            className="grid h-[150px] grid-cols-6 items-end gap-1.5 border-b border-border md:h-[220px] md:gap-2"
          >
            {meses.map(({ year, month, counts }) => {
              const totalMes = USAGE_TYPES.reduce((soma, t) => soma + counts[t], 0)

              return (
                <div
                  key={`${year}-${month}`}
                  className="flex h-full flex-col items-center justify-end gap-1 md:gap-1.5"
                >
                  <span className="tabular text-[11px] text-muted-foreground md:text-xs">
                    {totalMes > 0 ? counts.LOGIN : ''}
                  </span>
                  <div className="flex h-[120px] items-end gap-[3px] md:h-[180px] md:gap-1">
                    {USAGE_TYPES.map((type) => (
                      <span
                        key={type}
                        className={cn(
                          'w-[9px] rounded-t-[3px] md:w-3.5 md:rounded-t-[4px]',
                          counts[type] === 0 ? 'bg-border' : BAR_CLASS[type],
                        )}
                        style={{
                          height:
                            counts[type] === 0
                              ? '3px'
                              : `${Math.max(4, Math.round((counts[type] / maximo) * 100))}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="-mt-1.5 grid grid-cols-6 gap-1.5 md:-mt-2 md:gap-2">
            {meses.map(({ year, month }, index) => (
              <span
                key={`${year}-${month}`}
                className={cn(
                  'text-center text-xs md:text-[13px]',
                  index === meses.length - 1
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {MESES_CURTOS[month - 1]}
              </span>
            ))}
          </div>

          <Legenda className="md:hidden" curta />

          <div className="overflow-x-auto rounded-xl border border-divider">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-table-head text-left text-xs tracking-[0.04em] text-muted-foreground uppercase">
                  <th className="px-3.5 py-2.5 font-semibold">Mês</th>
                  {USAGE_TYPES.map((type) => (
                    <th key={type} className="px-3.5 py-2.5 text-right font-semibold whitespace-nowrap">
                      {USAGE_LABELS[type]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.byMonth.map(({ year, month, counts }) => (
                  <tr key={`${year}-${month}`} className="border-t border-divider">
                    <td className="px-3.5 py-2.5 whitespace-nowrap first-letter:uppercase">{monthLabel(year, month)}</td>
                    {USAGE_TYPES.map((type) => (
                      <td key={type} className="tabular px-3.5 py-2.5 text-right">
                        {counts[type]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex min-w-0 flex-col rounded-card border border-border bg-card p-4 md:p-5">
          <h2 className="mb-2 text-[17px] font-semibold md:mb-3 md:text-lg">Atividade recente</h2>

          {summary.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum evento registrado ainda. Acessar, gerar ou baixar uma escala vai aparecer
              aqui.
            </p>
          ) : (
            <ul>
              {summary.recent.map((event) => {
                const Icon = ICONS[event.type]

                return (
                  <li
                    key={event.id}
                    className="flex items-center gap-3 border-t border-divider py-2.5 md:py-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-subtle">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-medium">
                        {EVENT_LABELS[event.type]}
                        {event.year && event.month && (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            · {monthLabel(event.year, event.month)}
                          </span>
                        )}
                      </span>
                      <span className="tabular text-[13px] text-muted-foreground">
                        {dateTime.format(event.createdAt)}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        event.actor === 'ADMIN'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-subtle',
                      )}
                    >
                      {event.actor === 'ADMIN' ? 'Você' : 'Equipe'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function Legenda({ className, curta }: { className?: string; curta?: boolean }) {
  const curtos: Record<UsageType, string> = {
    LOGIN: 'Acessos',
    SCHEDULE_GENERATED: 'Geradas',
    SCHEDULE_DOWNLOADED: 'Baixadas',
  }

  return (
    <div className={cn('flex flex-wrap gap-3 text-xs text-subtle md:gap-3.5 md:text-[13px]', className)}>
      {USAGE_TYPES.map((type) => (
        <span key={type} className="flex items-center gap-1.5">
          <span className={cn('size-2.5 rounded-[3px]', BAR_CLASS[type])} />
          {curta ? curtos[type] : USAGE_LABELS[type]}
        </span>
      ))}
    </div>
  )
}
