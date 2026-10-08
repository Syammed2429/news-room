import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useSources } from '@/hooks/useSources'
import type { ProviderId } from '@shared/news'

interface Props {
  selected: ProviderId[]
  onToggle: (id: ProviderId) => void
}

export const SourceCheckboxes = ({ selected, onToggle }: Props) => {
  const { sources, isLoading } = useSources()

  if (isLoading) {
    return (
      <div aria-hidden className="flex flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-36" />
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {sources.map(({ id, name }) => (
        <li key={id}>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox checked={selected.includes(id)} onCheckedChange={() => onToggle(id)} />
            {name}
          </label>
        </li>
      ))}
    </ul>
  )
}
