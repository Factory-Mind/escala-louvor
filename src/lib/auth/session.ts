export const SESSION_COOKIE = 'escala_sessao'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30

const encoder = new TextEncoder()

export async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('escala-louvor:sessao:v1'))
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function safeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  let diff = left.length ^ right.length
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }
  return diff === 0
}

export async function isValidSession(cookie: string | undefined, password: string): Promise<boolean> {
  if (!cookie) return false
  return safeEqual(cookie, await sessionToken(password))
}

export function safeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/')) return '/'
  const url = new URL(next, 'http://n')
  if (url.origin !== 'http://n') return '/'
  return url.pathname + url.search + url.hash
}
