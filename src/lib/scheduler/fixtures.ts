import type { Role } from '@/lib/domain/types'
import type { GenerateInput, GeneratorMember } from './generate'
import type { RotationTeam } from './rotation'

/**
 * Fixtures compartilhadas pelos testes do gerador e do exportador.
 * Nao e usada em producao — vive aqui para os dois arquivos de teste
 * partirem do mesmo cenario conhecido.
 */

type MemberSpec = [id: string, name: string, roles: Role[], isGestor?: boolean]

const MEMBER_SPECS: MemberSpec[] = [
  ['vm1', 'HENRY', ['VOCAL_MASC']],
  ['vm2', 'KALEB', ['VOCAL_MASC']],
  ['vm3', 'ELDES', ['VOCAL_MASC']],
  ['vm4', 'GABRIEL', ['VOCAL_MASC']],

  ['vf1', 'GI', ['VOCAL_FEM']],
  ['vf2', 'LARISSA', ['VOCAL_FEM']],
  ['vf3', 'REBECA', ['VOCAL_FEM']],
  ['vf4', 'AMANDA', ['VOCAL_FEM']],
  ['vf5', 'MANU', ['VOCAL_FEM']],
  ['vf6', 'FLOR', ['VOCAL_FEM']],

  ['tec1', 'DIGO', ['TECLADO'], true],
  ['tec2', 'NINA', ['TECLADO']],

  ['bx1', 'DALLA', ['BAIXO']],
  ['bx2', 'RUD', ['BAIXO']],
  ['bx3', 'AMORAS', ['BAIXO'], true],

  ['gt1', 'BRENO', ['GUITARRA']],
  ['gt2', 'WILLIAN', ['GUITARRA'], true],

  ['bt1', 'RAPHA', ['BATERIA']],
  ['bt2', 'KADU', ['BATERIA']],

  ['sm1', 'PEDRO', ['SOM']],
  ['sm2', 'JORGE', ['SOM']],
  ['pj1', 'JACKSON', ['PROJECAO']],
  ['pj2', 'JUNIOR', ['PROJECAO']],
]

export const members: GeneratorMember[] = MEMBER_SPECS.map(
  ([id, name, roles, isGestor]) => ({
    id,
    name,
    roles,
    isGestor: isGestor ?? false,
    isMinistro: false,
    active: true,
  }),
)

export function memberByName(name: string): GeneratorMember {
  const found = members.find((m) => m.name === name)
  if (!found) throw new Error(`fixture sem integrante "${name}"`)
  return found
}

/** Times nao tem mais gente: sao so o rotulo e a cor da linha. */
export const teams: RotationTeam[] = [
  { id: 't1', name: 'TIME 1', color: '#ED7D31', order: 0 },
  { id: 't2', name: 'TIME 2', color: '#FFFF00', order: 1 },
  { id: 't3', name: 'TIME 3', color: '#66EE77', order: 2 },
  { id: 't4', name: 'TIME 4', color: '#3DA5F4', order: 3 },
]

export const formation: Record<Role, number> = {
  VOCAL_MASC: 1,
  VOCAL_FEM: 2,
  TECLADO: 1,
  BAIXO: 1,
  GUITARRA: 1,
  BATERIA: 1,
  SOM: 1,
  PROJECAO: 1,
}

export function makeInput(overrides: Partial<GenerateInput> = {}): GenerateInput {
  return {
    year: 2026,
    month: 8,
    teams,
    formation,
    members,
    unavailable: new Set<string>(),
    seed: 'teste',
    ...overrides,
  }
}
