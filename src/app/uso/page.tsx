import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { ChartColumn } from 'lucide-react'
import { SESSION_COOKIE, getSessionRole } from '@/lib/auth/session'
import { monthLabel } from '@/lib/domain/months'
import { USAGE_LABELS, USAGE_TYPES } from '@/lib/usage/summary'
import { PageBar } from '@/components/page-bar'
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

export default async function UsagePage({
  searchParams,
}: {
  searchParams: Promise<{ todos?: string }>
}) {
  const role = await getSessionRole((await cookies()).get(SESSION_COOKIE)?.value)
  if (role !== 'admin') notFound()

  const includeAdmin = (await searchParams).todos === '1'
  const summary = await loadUsageSummary(includeAdmin)

  return (
    <div>
      <PageBar icon={ChartColumn} title="Uso do app">
        <Link
          href={includeAdmin ? '/uso' : '/uso?todos=1'}
          className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {includeAdmin ? 'Ocultar minhas ações' : 'Incluir minhas ações'}
        </Link>
      </PageBar>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {USAGE_TYPES.map((type) => (
          <section key={type} className="rounded-2xl border border-border px-5 py-4">
            <h2 className="text-sm text-muted-foreground">{USAGE_LABELS[type]}</h2>
            <p className="tabular mt-1 text-3xl font-semibold">{summary.last7[type]}</p>
            <p className="tabular text-sm text-muted-foreground">
              últimos 7 dias · {summary.last30[type]} em 30 dias
            </p>
          </section>
        ))}
      </div>

      <h2 className="mb-3 text-[15px] font-semibold">Por mês</h2>
      <div className="mb-8 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Mês</th>
              {USAGE_TYPES.map((type) => (
                <th key={type} className="px-4 py-2.5 text-right font-medium">
                  {USAGE_LABELS[type]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.byMonth.map(({ year, month, counts }) => (
              <tr key={`${year}-${month}`} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 capitalize">{monthLabel(year, month)}</td>
                {USAGE_TYPES.map((type) => (
                  <td key={type} className="tabular px-4 py-2.5 text-right">
                    {counts[type]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-[15px] font-semibold">Eventos recentes</h2>
      {summary.recent.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda.</p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border">
          {summary.recent.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span className="tabular w-32 text-muted-foreground">{dateTime.format(event.createdAt)}</span>
              <span className="font-medium">{USAGE_LABELS[event.type]}</span>
              {event.year && event.month && (
                <span className="capitalize text-muted-foreground">{monthLabel(event.year, event.month)}</span>
              )}
              <span
                className={cn(
                  'ml-auto rounded-lg px-2 py-0.5 text-xs',
                  event.actor === 'ADMIN' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                )}
              >
                {event.actor === 'ADMIN' ? 'Você' : 'Equipe'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
