import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface Props extends ComponentProps<'button'> {
  pressed: boolean
}

export const Chip = ({ pressed, className, ...props }: Props) => (
  <button
    type="button"
    aria-pressed={pressed}
    className={cn(
      'shrink-0 rounded-full border px-3 py-1 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
      pressed ? 'border-primary bg-primary text-primary-foreground' : 'border-input hover:bg-muted',
      className,
    )}
    {...props}
  />
)
