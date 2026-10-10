'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CalendarX2, ChartColumn, LogOut, Palette, Users } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/app/login/actions'

const LINKS = [
  {
    href: '/',
    label: 'Escala',
    description: 'Gera a escala do mês, permite trocar pessoas e baixar a planilha.',
    icon: CalendarDays,
  },
  {
    href: '/times',
    label: 'Times',
    description: 'Quantas pessoas cada posição leva por culto e as cores do rodízio.',
    icon: Palette,
  },
  {
    href: '/integrantes',
    label: 'Integrantes',
    description: 'Cadastro de quem serve, o que cada um toca e quem pode ser gestor.',
    icon: Users,
  },
  {
    href: '/disponibilidade',
    label: 'Disponibilidade',
    description: 'Marque os dias em que cada integrante avisou que não pode.',
    icon: CalendarX2,
  },
]

const ADMIN_LINKS = [
  {
    href: '/uso',
    label: 'Uso',
    description: 'Acessos, escalas geradas e baixadas. Só você vê esta seção.',
    icon: ChartColumn,
  },
]

/**
 * Rail de icones no fundo cinza, ao lado do painel branco.
 *
 * No celular vira uma barra horizontal com os rotulos, porque quatro icones
 * sozinhos no topo de uma tela estreita nao dizem para onde levam.
 */
export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <nav
      aria-label="Seções"
      className="flex shrink-0 items-center gap-1 px-2 py-2 md:w-[68px] md:gap-0 md:flex-col md:items-center md:px-0 md:py-4"
    >
      <Link
        href="/"
        aria-label="Escala de Louvor"
        className="mb-0 hidden size-9 items-center justify-center rounded-xl bg-foreground text-[13px] font-bold text-background md:mb-7 md:flex"
      >
        EL
      </Link>

      <ul className="flex min-w-0 flex-1 gap-1 overflow-x-auto md:flex-none md:flex-col md:gap-1.5 md:overflow-visible">
        {(isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS).map(({ href, label, description, icon: Icon }) => {
          const active = pathname === href

          return (
            <li key={href}>
              <Tooltip>
                <TooltipTrigger
                  render={<Link href={href} />}
                  aria-current={active ? 'page' : undefined}
                  aria-label={label}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors md:size-10 md:justify-center md:px-0 md:py-0',
                    active
                      ? 'bg-foreground font-medium text-background'
                      : 'text-muted-foreground hover:bg-card hover:text-foreground',
                  )}
                >
                  <Icon className="size-[18px] shrink-0" />
                  <span className="md:hidden">{label}</span>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="hidden flex-col items-start gap-0.5 md:flex"
                >
                  <span className="font-semibold">{label}</span>
                  <span className="opacity-80">{description}</span>
                </TooltipContent>
              </Tooltip>
            </li>
          )
        })}
      </ul>

      <form action={logoutAction} className="md:mt-4 md:border-t md:border-border md:pt-4">
        <Tooltip>
          <TooltipTrigger
            render={<button type="submit" />}
            aria-label="Sair"
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:size-10"
          >
            <LogOut className="size-[18px]" />
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8} className="hidden md:flex">
            Sair
          </TooltipContent>
        </Tooltip>
      </form>
    </nav>
  )
}
