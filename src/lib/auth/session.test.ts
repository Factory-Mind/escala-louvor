import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSession, safeEqual, safeNext, sessionToken } from './session'
import { middleware } from '@/middleware'

describe('sessionToken', () => {
  it('é determinístico e muda com a senha', async () => {
    expect(await sessionToken('a')).toBe(await sessionToken('a'))
    expect(await sessionToken('a')).not.toBe(await sessionToken('b'))
    expect(await sessionToken('a')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('safeEqual', () => {
  it('compara strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
    expect(safeEqual('', 'a')).toBe(false)
  })
})

describe('isValidSession', () => {
  it('aceita só o token da senha atual', async () => {
    expect(await isValidSession(await sessionToken('s3nha'), 's3nha')).toBe(true)
    expect(await isValidSession(await sessionToken('antiga'), 's3nha')).toBe(false)
    expect(await isValidSession('s3nha', 's3nha')).toBe(false)
    expect(await isValidSession(undefined, 's3nha')).toBe(false)
  })
})

describe('safeNext', () => {
  it('só aceita caminhos internos', () => {
    expect(safeNext('/integrantes?x=1')).toBe('/integrantes?x=1')
    expect(safeNext('https://evil.com')).toBe('/')
    expect(safeNext('//evil.com')).toBe('/')
    expect(safeNext('/\\evil.com')).toBe('/')
    expect(safeNext(null)).toBe('/')
  })

  it('recusa caminhos que o navegador transforma em outro domínio', () => {
    expect(safeNext('/\t/evil.com')).toBe('/')
    expect(safeNext('/\n/evil.com')).toBe('/')
    expect(safeNext('/\r/evil.com')).toBe('/')
    expect(safeNext(new URLSearchParams('next=/%09/evil.com').get('next'))).toBe('/')
  })

  it('mantém caminho, busca e âncora', () => {
    expect(safeNext('/times?mes=10#a')).toBe('/times?mes=10#a')
    expect(safeNext('/')).toBe('/')
  })
})

describe('middleware', () => {
  const original = process.env.APP_PASSWORD

  beforeEach(() => {
    process.env.APP_PASSWORD = 's3nha'
  })

  afterEach(() => {
    process.env.APP_PASSWORD = original
  })

  const request = (path: string, init: { method?: string; cookie?: string } = {}) =>
    new NextRequest(`https://app.test${path}`, {
      method: init.method ?? 'GET',
      headers: init.cookie ? { cookie: `${SESSION_COOKIE}=${init.cookie}` } : {},
    })

  it('redireciona GET sem sessão para o login mantendo o destino', async () => {
    const res = await middleware(request('/integrantes?a=1'))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/login')
    expect(location.searchParams.get('next')).toBe('/integrantes?a=1')
  })

  it('bloqueia POST (server actions) e API sem sessão', async () => {
    expect((await middleware(request('/integrantes', { method: 'POST' }))).status).toBe(401)
    expect((await middleware(request('/', { method: 'POST', cookie: 'forjado' }))).status).toBe(401)
  })

  it('deixa passar com sessão válida', async () => {
    const res = await middleware(request('/api/export?year=2026&month=9', { cookie: await sessionToken('s3nha') }))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })

  it('libera só o /login exato', async () => {
    expect((await middleware(request('/login', { method: 'POST' }))).headers.get('x-middleware-next')).toBe('1')
    expect((await middleware(request('/login-falso'))).status).toBe(307)
  })

  it('fica fechado quando APP_PASSWORD não existe', async () => {
    delete process.env.APP_PASSWORD
    expect((await middleware(request('/'))).status).toBe(503)
  })
})
