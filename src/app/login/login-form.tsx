'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction, type LoginState } from './actions'

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <input type="text" name="username" autoComplete="username" value="louvor" readOnly hidden />

      <Label htmlFor="password">Senha</Label>
      <Input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? 'password-error' : undefined}
      />

      {state.error && (
        <p id="password-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
