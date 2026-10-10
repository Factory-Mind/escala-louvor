import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { cookies } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppNav } from '@/components/app-nav'
import { AppShell } from '@/components/app-shell'
import { SESSION_COOKIE, getSessionRole } from '@/lib/auth/session'
import './globals.css'

const geist = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Escala de Louvor',
  description: 'Monta a escala mensal do time de louvor e exporta a planilha.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await getSessionRole((await cookies()).get(SESSION_COOKIE)?.value)

  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="antialiased">
        <TooltipProvider delay={300}>
          <AppShell nav={<AppNav isAdmin={role === 'admin'} />}>{children}</AppShell>
        </TooltipProvider>
        <Toaster position="bottom-right" />
        {role !== 'admin' && <Analytics />}
      </body>
    </html>
  )
}
