import type { Metadata } from 'next'
import { safeNext } from '@/lib/auth/session'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Entrar · Escala de Louvor',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="mx-auto flex max-w-xs flex-col gap-6 py-16">
      <div className="flex flex-col gap-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-[13px] font-bold text-background">
          EL
        </span>
        <h1 className="text-lg font-semibold tracking-tight">Escala de Louvor</h1>
        <p className="text-sm text-muted-foreground">Digite a senha para acessar.</p>
      </div>

      <LoginForm next={safeNext(next)} />
    </div>
  )
}
