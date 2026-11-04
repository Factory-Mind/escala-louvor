'use client'

import { usePathname } from 'next/navigation'

export function AppShell({ nav, children }: { nav: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') return <>{children}</>

  return (
    <div className="flex min-h-dvh bg-background md:p-4 lg:p-5">
      {nav}
      <main className="dotted min-w-0 flex-1 px-4 pt-5 pb-28 md:rounded-[32px] md:border md:border-border/80 md:px-8 md:pt-8 md:pb-14 lg:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 md:gap-6">{children}</div>
      </main>
    </div>
  )
}
