import { beforeEach, describe, expect, it, vi } from 'vitest'

const create = vi.fn()
const pending: Array<() => Promise<void>> = []

vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({ prisma: { usageEvent: { create } } }))
vi.mock('next/server', () => ({ after: (fn: () => Promise<void>) => pending.push(fn) }))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers({ 'user-agent': 'Teste/1.0' }),
}))

const { recordEvent } = await import('./events')

async function flush() {
  while (pending.length) await pending.shift()!()
}

describe('recordEvent', () => {
  beforeEach(() => {
    create.mockReset()
    pending.length = 0
  })

  it('grava o evento depois da resposta', async () => {
    await recordEvent('SCHEDULE_DOWNLOADED', { year: 2026, month: 10 }, 'member')
    expect(create).not.toHaveBeenCalled()

    await flush()
    expect(create).toHaveBeenCalledWith({
      data: {
        type: 'SCHEDULE_DOWNLOADED',
        actor: 'MEMBER',
        year: 2026,
        month: 10,
        userAgent: 'Teste/1.0',
      },
    })
  })

  it('marca o admin', async () => {
    await recordEvent('LOGIN', {}, 'admin')
    await flush()
    expect(create.mock.calls[0][0].data).toMatchObject({ type: 'LOGIN', actor: 'ADMIN', year: null, month: null })
  })

  it('não propaga falha do banco', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    create.mockRejectedValue(new Error('banco fora'))

    await expect(recordEvent('SCHEDULE_GENERATED', { year: 2026, month: 10 })).resolves.toBeUndefined()
    await expect(flush()).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})
