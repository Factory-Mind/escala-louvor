/**
 * Gerador de numeros pseudoaleatorios deterministico.
 *
 * Clicar em "Gerar" sorteia uma seed nova, entao a escala sai diferente a cada
 * clique; reabrir uma escala salva com a mesma seed reproduz exatamente o mesmo
 * resultado, o que tambem torna os testes estaveis.
 */

/** cyrb53 — hash de string rapido e com boa dispersao. */
function hashSeed(seed: string): number {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57

  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  return (h2 >>> 0) * 4294967296 + (h1 >>> 0)
}

export type Rng = () => number

/** mulberry32 — pequeno, rapido e suficiente para sortear escala. */
export function createRng(seed: string): Rng {
  let state = hashSeed(seed) >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Seed nova a cada clique em "Gerar". */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 12)
}
