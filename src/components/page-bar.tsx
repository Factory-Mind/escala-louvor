import type { LucideIcon } from 'lucide-react'

/**
 * Faixa de titulo no topo do painel: icone e nome da secao a esquerda, os
 * controles da pagina a direita. E o que mantem as quatro telas com a mesma
 * cara sem repetir a marcacao em cada uma.
 */
export function PageBar({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border pb-5">
      <h1 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
        <Icon className="size-[19px] text-faint" />
        {title}
      </h1>

      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
