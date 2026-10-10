'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { loginAction, type LoginState } from './actions'

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {})
  const [visivel, setVisivel] = useState(false)

  return (
    <form action={formAction} className="flex flex-col gap-6 md:gap-7">
      <input type="hidden" name="next" value={next} />
      <input type="text" name="username" autoComplete="username" value="louvor" readOnly hidden />

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Senha
        </Label>
        <div
          className={cn(
            'flex items-center rounded-xl border border-input bg-card pr-1 transition-shadow focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20',
            state.error && 'border-destructive',
          )}
        >
          <input
            id="password"
            name="password"
            type={visivel ? 'text' : 'password'}
            autoComplete="current-password"
            autoFocus
            required
            placeholder="••••••••"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? 'password-error' : undefined}
            className="min-h-12 min-w-0 flex-1 rounded-xl bg-transparent px-3.5 text-base outline-none placeholder:text-faint"
          />
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visivel}
            className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {visivel ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>

        {state.error && (
          <p id="password-error" role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={pending} className="h-12 rounded-xl text-base">
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
