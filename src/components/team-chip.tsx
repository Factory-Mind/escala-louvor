import { cn } from '@/lib/utils'

export function teamStyle(color: string) {
  return { '--team': color } as React.CSSProperties
}

export function TeamDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('team-dot inline-block size-2 shrink-0 rounded-[2px]', className)}
      style={teamStyle(color)}
    />
  )
}

export function TeamChip({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'team-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap',
        className,
      )}
      style={teamStyle(color)}
    >
      <TeamDot color={color} />
      {name}
    </span>
  )
}
