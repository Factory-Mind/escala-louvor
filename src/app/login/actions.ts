'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { recordEvent } from '@/server/events'
import { SESSION_COOKIE, SESSION_MAX_AGE, adminPassword, safeEqual, safeNext, sessionToken } from '@/lib/auth/session'

export type LoginState = { error?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.APP_PASSWORD
  if (!expected) return { error: 'APP_PASSWORD não configurada no servidor.' }

  const admin = adminPassword()
  const password = formData.get('password')
  const isAdmin = typeof password === 'string' && !!admin && safeEqual(password, admin)
  const isMember = typeof password === 'string' && safeEqual(password, expected)

  if (!isAdmin && !isMember) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    return { error: 'Senha incorreta.' }
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, await sessionToken(isAdmin ? admin! : expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })

  recordEvent('LOGIN', {}, isAdmin ? 'admin' : 'member')

  redirect(safeNext(formData.get('next')))
}

export async function logoutAction() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/login')
}
