'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  CalendarX2,
  ChartColumn,
  LogOut,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/app/login/actions'

type NavLink = {
  href: string
  label: string
  short: string
  icon: LucideIcon
}

const LINKS: NavLink[] = [
  { href: '/', label: 'Escala', short: 'Escala', icon: CalendarDays },
  { href: '/times', label: 'Times e formação', short: 'Times', icon: SlidersHorizontal },
  { href: '/integrantes', label: 'Integrantes', short: 'Integrantes', icon: Users },
  { href: '/disponibilidade', label: 'Disponibilidade', short: 'Ausências', icon: CalendarX2 },
]

const ADMIN_LINKS: NavLink[] = [
  { href: '/uso', label: 'Uso do app', short: 'Uso', icon: ChartColumn },
]

export function AppNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()

  if (pathname === '/login') return null

  const links = isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS

  return (
    <>
      <nav
        aria-label="Menu principal"
        className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-1 border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex"
      >
        <Link href="/" className="flex items-center gap-2.5 rounded-xl px-2 pt-1 pb-6">
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
            EL
          </span>
          <span className="text-[15px] font-semibold text-foreground">Escala de Louvor</span>
        </Link>

        <ul className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href

            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    active
                      ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  <Icon className="size-[18px] shrink-0" aria-hidden />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        <form action={logoutAction} className="mt-auto border-t border-sidebar-border pt-4">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-[15px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <LogOut className="size-[18px] shrink-0" aria-hidden />
            Sair
          </button>
        </form>
      </nav>

      <nav
        aria-label="Navegação"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-sidebar-border bg-sidebar px-1 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden"
      >
        {links.map(({ href, short, icon: Icon }) => {
          const active = pathname === href

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px]',
                active ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-[22px]" aria-hidden />
              <span className="max-w-full truncate">{short}</span>
            </Link>
          )
        })}

        <form action={logoutAction} className="flex min-w-0 flex-1">
          <button
            type="submit"
            className="flex min-h-12 w-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
          >
            <LogOut className="size-[22px]" aria-hidden />
            Sair
          </button>
        </form>
      </nav>
    </>
  )
}
