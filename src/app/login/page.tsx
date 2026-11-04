import type { Metadata } from 'next'
import { safeNext } from '@/lib/auth/session'
import { teamStyle } from '@/components/team-chip'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Entrar · Escala de Louvor',
  robots: { index: false, follow: false },
}

const EXEMPLOS = [
  { weekday: 'DOM', day: '04', culto: 'Culto da manhã', time: 'Time 3', cor: '#66EE77' },
  { weekday: 'QUA', day: '07', culto: 'Culto de quarta', time: 'Time 4', cor: '#3DA5F4' },
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="flex min-h-dvh flex-col bg-background p-3.5 md:flex-row md:p-4">
      <section className="relative flex flex-col gap-6 overflow-hidden rounded-[28px] bg-brand-strong px-6 pt-10 pb-8 text-brand-foreground md:flex-1 md:justify-between md:gap-12 md:rounded-[32px] md:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 size-[380px] rounded-full border border-brand-foreground/8"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-36 -left-36 size-[520px] rounded-full border border-brand-foreground/8"
        />

        <div className="relative flex items-center gap-2.5 md:gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-foreground/12 text-[15px] font-semibold text-brand-foreground">
            EL
          </span>
          <span className="text-base font-semibold">Escala de Louvor</span>
        </div>

        <div className="relative flex max-w-[460px] flex-col gap-5">
          <p className="text-[30px] leading-[1.12] font-bold tracking-[-0.025em] md:text-[42px] md:leading-[1.08] md:tracking-[-0.03em]">
            A escala do mês, pronta em minutos.
          </p>
          <p className="hidden text-[17px] leading-normal text-brand-foreground/80 md:block">
            Rodízio dos times, ausências de cada um e a planilha para mandar no grupo.
          </p>
          <ul aria-hidden className="mt-2 hidden flex-col gap-2.5 md:flex">
            {EXEMPLOS.map((item) => (
              <li
                key={item.day}
                className="flex items-center gap-3 rounded-2xl bg-card/45 px-4 py-3 backdrop-blur-xs"
              >
                <span className="flex w-10 flex-col text-center">
                  <span className="text-[11px] font-semibold text-brand-foreground/65">
                    {item.weekday}
                  </span>
                  <span className="text-lg font-bold">{item.day}</span>
                </span>
                <span className="flex-1 text-[15px] font-medium">{item.culto}</span>
                <span
                  className="team-chip rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={teamStyle(item.cor)}
                >
                  {item.time}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <span className="hidden md:block" />
      </section>

      <main className="flex flex-1 justify-center px-3 pt-8 pb-10 md:items-center md:px-6 md:py-12">
        <div className="flex w-full max-w-[380px] flex-col gap-6 md:gap-7">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[30px]">Entrar</h1>
            <p className="text-[15px] text-muted-foreground md:text-base">
              Digite a senha do ministério para acessar.
            </p>
          </div>

          <LoginForm next={safeNext(next)} />
        </div>
      </main>
    </div>
  )
}
