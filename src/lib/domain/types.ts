/**
 * Tipos de dominio da escala.
 *
 * O provider `sqlite` do Prisma nao suporta `enum`, entao `role` e `service`
 * sao gravados como String no banco. As constantes abaixo sao a fonte da
 * verdade e os schemas zod validam tudo que entra pelas server actions.
 */
import { z } from 'zod'

/** Instrumentos / posicoes — a ordem aqui define a ordem das colunas. */
export const ROLES = [
  'VOCAL_MASC',
  'VOCAL_FEM',
  'TECLADO',
  'BAIXO',
  'GUITARRA',
  'BATERIA',
  'SOM',
  'PROJECAO',
] as const

export type Role = (typeof ROLES)[number]

export const roleSchema = z.enum(ROLES)

/** Rotulo da coluna na planilha, exatamente como o lider escreve hoje. */
export const ROLE_LABELS: Record<Role, string> = {
  VOCAL_MASC: 'VOCAIS MASC',
  VOCAL_FEM: 'VOCAIS FEM',
  TECLADO: 'TECLADO',
  BAIXO: 'BAIXO',
  GUITARRA: 'GUITARRA',
  BATERIA: 'BATERIA',
  SOM: 'SOM',
  PROJECAO: 'PROJEÇÃO',
}

/** Formacao padrao: quantas pessoas cada posicao leva em cada culto. */
export const DEFAULT_FORMATION: Record<Role, number> = {
  VOCAL_MASC: 1,
  VOCAL_FEM: 2,
  TECLADO: 1,
  BAIXO: 1,
  GUITARRA: 1,
  BATERIA: 1,
  SOM: 1,
  PROJECAO: 1,
}

/** Versao curta, para caber nos controles de cadastro. */
export const ROLE_SHORT_LABELS: Record<Role, string> = {
  VOCAL_MASC: 'Voc. masc',
  VOCAL_FEM: 'Voc. fem',
  TECLADO: 'Teclado',
  BAIXO: 'Baixo',
  GUITARRA: 'Guitarra',
  BATERIA: 'Bateria',
  SOM: 'Som',
  PROJECAO: 'Projeção',
}

/**
 * Colunas da planilha. Som e projecao sao posicoes separadas no cadastro e no
 * sorteio, mas continuam saindo juntas na mesma coluna, como "SOM/PROJEÇÃO".
 */
export const COLUMNS = [
  { key: 'VOCAL_MASC', label: 'VOCAIS MASC', roles: ['VOCAL_MASC'] },
  { key: 'VOCAL_FEM', label: 'VOCAIS FEM', roles: ['VOCAL_FEM'] },
  { key: 'TECLADO', label: 'TECLADO', roles: ['TECLADO'] },
  { key: 'BAIXO', label: 'BAIXO', roles: ['BAIXO'] },
  { key: 'GUITARRA', label: 'GUITARRA', roles: ['GUITARRA'] },
  { key: 'BATERIA', label: 'BATERIA', roles: ['BATERIA'] },
  { key: 'SOM_PROJECAO', label: 'SOM/PROJEÇÃO', roles: ['SOM', 'PROJECAO'] },
] as const satisfies ReadonlyArray<{ key: string; label: string; roles: readonly Role[] }>

export type ColumnKey = (typeof COLUMNS)[number]['key']

/** Cultos que entram na escala. */
export const SERVICES = ['DOM_MANHA', 'DOM_NOITE', 'QUARTA'] as const

export type ServiceKind = (typeof SERVICES)[number]

export const serviceSchema = z.enum(SERVICES)

export const SERVICE_LABELS: Record<ServiceKind, string> = {
  DOM_MANHA: 'DOM MANHÃ',
  DOM_NOITE: 'DOM NOITE',
  QUARTA: 'QUARTA',
}

export const EXCEPTION_KINDS = ['EM_ABERTO', 'LOUVOR_EXTERNO'] as const

export type ExceptionKind = (typeof EXCEPTION_KINDS)[number]

export const exceptionKindSchema = z.enum(EXCEPTION_KINDS)

export const EXCEPTION_LABELS: Record<ExceptionKind, string> = {
  EM_ABERTO: 'EM ABERTO',
  LOUVOR_EXTERNO: 'LOUVOR CONVIDADO',
}

export const EXCEPTION_KIND_OPTIONS: Record<ExceptionKind, string> = {
  EM_ABERTO: 'Em aberto',
  LOUVOR_EXTERNO: 'Louvor convidado',
}

export const VOCAL_ROLES = ['VOCAL_MASC', 'VOCAL_FEM'] as const satisfies readonly Role[]

export function exceptionText(kind: ExceptionKind, label?: string | null): string {
  const custom = label?.trim().toUpperCase()
  return custom ? `${EXCEPTION_LABELS[kind]} - ${custom}` : EXCEPTION_LABELS[kind]
}

export function isExceptionKind(value: string): value is ExceptionKind {
  return (EXCEPTION_KINDS as readonly string[]).includes(value)
}

/** Texto usado na celula quando nao sobrou ninguem disponivel. */
export const A_DEFINIR = 'A DEFINIR'

/** Sufixo colado no nome do responsavel do culto na exportacao. */
export const GESTOR_SUFFIX = 'GESTOR'

/** Cor do cabecalho da planilha. */
export const HEADER_COLOR = '#CCC0DA'

export const DEFAULT_TEAM_COLORS = ['#ED7D31', '#FFFF00', '#66EE77', '#3DA5F4'] as const

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value)
}

export function isServiceKind(value: string): value is ServiceKind {
  return (SERVICES as readonly string[]).includes(value)
}
