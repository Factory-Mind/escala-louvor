'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  CalendarDays,
  CalendarX2,
  ChartColumn,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { NAV_COLLAPSED_COOKIE } from '@/lib/nav'
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

function CollapsedTooltip({
  collapsed,
  label,
  trigger,
}: {
  collapsed: boolean
  label: string
  trigger: React.ReactElement
}) {
  if (!collapsed) return trigger

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function AppNav({
  isAdmin = false,
  defaultCollapsed = false,
}: {
  isAdmin?: boolean
  defaultCollapsed?: boolean
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  if (pathname === '/login') return null

  const links = isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    document.cookie = `${NAV_COLLAPSED_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`
  }

  const itemClass =
    'flex min-h-11 items-center gap-3 rounded-[10px] text-[15px] transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

  return (
    <>
      <nav
        id="menu-principal"
        aria-label="Menu principal"
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 overflow-hidden border-r border-sidebar-border bg-sidebar py-6 transition-[width] duration-200 md:flex',
          collapsed ? 'w-[76px] px-3' : 'w-[248px] px-4',
        )}
      >
        <div className={cn('flex items-center gap-2 pt-1 pb-6', collapsed ? 'flex-col' : 'justify-between px-2')}>
          <Link href="/" aria-label="Escala de Louvor" className="flex min-w-0 items-center gap-2.5 rounded-xl">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary text-sm font-semibold text-primary-foreground">
              EL
            </span>
            {!collapsed && (
              <span className="truncate text-[15px] font-semibold text-foreground">Escala de Louvor</span>
            )}
          </Link>

          <CollapsedTooltip
            collapsed={collapsed}
            label="Abrir menu"
            trigger={
              <button
                type="button"
                onClick={toggle}
                aria-expanded={!collapsed}
                aria-controls="menu-principal"
                aria-label={collapsed ? 'Abrir menu' : 'Recolher menu'}
                className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-[18px]" aria-hidden />
                ) : (
                  <PanelLeftClose className="size-[18px]" aria-hidden />
                )}
              </button>
            }
          />
        </div>

        <ul className="flex flex-col gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href

            return (
              <li key={href}>
                <CollapsedTooltip
                  collapsed={collapsed}
                  label={label}
                  trigger={
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? label : undefined}
                      className={cn(
                        itemClass,
                        collapsed ? 'justify-center px-0' : 'px-3',
                        active
                          ? 'bg-sidebar-primary font-medium text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <Icon className="size-[18px] shrink-0" aria-hidden />
                      {!collapsed && label}
                    </Link>
                  }
                />
              </li>
            )
          })}
        </ul>

        <form action={logoutAction} className="mt-auto border-t border-sidebar-border pt-4">
          <CollapsedTooltip
            collapsed={collapsed}
            label="Sair"
            trigger={
              <button
                type="submit"
                aria-label={collapsed ? 'Sair' : undefined}
                className={cn(
                  itemClass,
                  'w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  collapsed ? 'justify-center px-0' : 'px-3',
                )}
              >
                <LogOut className="size-[18px] shrink-0" aria-hidden />
                {!collapsed && 'Sair'}
              </button>
            }
          />
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
