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
    <div className="flex min-h-dvh flex-col bg-card md:flex-row md:bg-background">
      <section className="flex flex-col gap-6 rounded-b-[28px] bg-primary px-6 pt-12 pb-8 text-primary-foreground md:flex-1 md:justify-between md:gap-12 md:rounded-none md:p-12">
        <div className="flex items-center gap-2.5 md:gap-3">
          <span className="flex size-10 items-center justify-center rounded-[11px] bg-primary-foreground text-[15px] font-semibold text-primary">
            EL
          </span>
          <span className="text-base font-semibold">Escala de Louvor</span>
        </div>

        <div className="flex max-w-[460px] flex-col gap-5">
          <p className="text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[40px] md:leading-[1.1] md:tracking-[-0.03em]">
            A escala do mês, pronta em minutos.
          </p>
          <p className="hidden text-[17px] leading-normal text-primary-foreground/75 md:block">
            Rodízio dos times, ausências de cada um e a planilha para mandar no grupo.
          </p>
          <ul aria-hidden className="mt-2 hidden flex-col gap-2 md:flex">
            {EXEMPLOS.map((item) => (
              <li
                key={item.day}
                className="flex items-center gap-3 rounded-xl bg-primary-foreground/10 px-3.5 py-3"
              >
                <span className="flex w-10 flex-col text-center">
                  <span className="text-[11px] font-semibold text-primary-foreground/60">
                    {item.weekday}
                  </span>
                  <span className="text-lg font-semibold">{item.day}</span>
                </span>
                <span className="flex-1 text-[15px]">{item.culto}</span>
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

      <main className="flex flex-1 justify-center px-6 pt-8 pb-10 md:items-center md:py-12">
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
