import type { ServiceKind } from '@/lib/domain/types'

/**
 * Um dia de culto. O time e atribuido por DIA, nao por linha — e por isso que
 * domingo manha e domingo noite sempre saem com o mesmo time e a mesma cor.
 */
export type ServiceDay = {
  /** Meia-noite UTC do dia, para nao sofrer com fuso horario. */
  date: Date
  services: ServiceKind[]
}

/** Uma linha da planilha: um culto especifico num dia especifico. */
export type ServiceRow = {
  date: Date
  service: ServiceKind
  order: number
}

const SUNDAY = 0
const WEDNESDAY = 3

/** Domingo tem culto de manha e de noite; quarta tem um culto so. */
const SERVICES_BY_WEEKDAY: Record<number, ServiceKind[]> = {
  [SUNDAY]: ['DOM_MANHA', 'DOM_NOITE'],
  [WEDNESDAY]: ['QUARTA'],
}

/**
 * Lista, em ordem cronologica, os dias de culto de um mes.
 *
 * @param year ano com quatro digitos
 * @param month mes de 1 a 12
 */
export function buildServiceDays(year: number, month: number): ServiceDay[] {
  const days: ServiceDay[] = []
  const cursor = new Date(Date.UTC(year, month - 1, 1))

  while (cursor.getUTCMonth() === month - 1) {
    const services = SERVICES_BY_WEEKDAY[cursor.getUTCDay()]
    if (services) {
      days.push({ date: new Date(cursor), services: [...services] })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return days
}

/** Achata os dias em linhas numeradas, na ordem em que aparecem na planilha. */
export function flattenRows(days: ServiceDay[]): ServiceRow[] {
  const rows: ServiceRow[] = []

  for (const day of days) {
    for (const service of day.services) {
      rows.push({ date: day.date, service, order: rows.length })
    }
  }

  return rows
}

/** Formata como a planilha: DD/MM/AAAA, sempre em UTC. */
export function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${date.getUTCFullYear()}`
}

/** Chave estavel de uma data, usada para indexar indisponibilidades. */
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}
