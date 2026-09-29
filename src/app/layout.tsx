import type { Metadata } from 'next'
import { Archivo } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppNav } from '@/components/app-nav'
import './globals.css'

// O eixo `wdth` e o que permite estreitar os titulos sem carregar uma segunda
// familia tipografica.
const archivo = Archivo({
  variable: '--font-sans',
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Escala de Louvor',
  description: 'Monta a escala mensal do time de louvor e exporta a planilha.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={archivo.variable}>
      <body className="antialiased">
        <TooltipProvider delay={300}>
          {/* Rail de icones no fundo cinza; o conteudo vive num painel branco
              arredondado por cima dele. */}
          <div className="flex min-h-screen flex-col md:flex-row">
            <AppNav />

            <main className="min-w-0 flex-1 p-2 md:py-3 md:pr-3 md:pl-0">
              <div className="min-h-full rounded-2xl border border-border bg-card px-5 py-6 sm:px-7 md:rounded-3xl md:px-10 md:py-9">
                {children}
              </div>
            </main>
          </div>
        </TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
