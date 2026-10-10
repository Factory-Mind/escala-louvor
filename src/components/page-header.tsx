export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <header className="-mx-4 -mt-5 flex flex-col gap-3.5 border-b border-border bg-card px-4 pt-6 pb-4 md:mx-0 md:mt-0 md:gap-4 md:border-0 md:bg-transparent md:p-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5 md:gap-2">
          {eyebrow && (
            <span className="hidden text-sm text-muted-foreground md:block">{eyebrow}</span>
          )}
          {typeof title === 'string' ? (
            <h1 className="text-2xl font-semibold tracking-[-0.02em] md:text-[32px] md:leading-tight">
              {title}
            </h1>
          ) : (
            title
          )}
          {description && (
            <p className="max-w-[680px] text-sm leading-relaxed text-muted-foreground md:text-base">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {children}
    </header>
  )
}
