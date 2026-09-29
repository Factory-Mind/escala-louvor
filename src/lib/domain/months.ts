const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** "agosto de 2026" — usado no seletor de mes e nos textos corridos. */
export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1]} de ${year}`
}

/** So o nome do mes: o titulo da tela de escala separa mes e ano. */
export function monthName(month: number): string {
  return MONTHS[month - 1]
}
