import { format, parseISO } from 'date-fns'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSources } from '@/hooks/useSources'
import { useSearchStore } from '@/store/search'

interface RemovableProps {
  label: string
  onRemove: () => void
}

const Removable = ({ label, onRemove }: RemovableProps) => (
  <li>
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove filter: ${label}`}
      className="inline-flex items-center gap-1 rounded-full bg-secondary py-1 pr-1.5 pl-3 text-sm outline-none hover:bg-secondary/70 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {label}
      <XIcon aria-hidden className="size-3.5" />
    </button>
  </li>
)

const formatDay = (iso: string) => format(parseISO(iso), 'd MMM yyyy')

// chips for the filters that are on, each one removable
export const ActiveFilters = () => {
  const { providerIds, from, to } = useSearchStore()
  const { toggleProvider, setFrom, setTo, resetFilters } = useSearchStore.getState()
  const { sources } = useSources()

  const hasAny = providerIds.length > 0 || Boolean(from) || Boolean(to)
  if (!hasAny) return null

  return (
    <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {providerIds.map((id) => (
        <Removable
          key={id}
          label={sources.find((source) => source.id === id)?.name ?? id}
          onRemove={() => toggleProvider(id)}
        />
      ))}
      {from && <Removable label={`From ${formatDay(from)}`} onRemove={() => setFrom(undefined)} />}
      {to && <Removable label={`Until ${formatDay(to)}`} onRemove={() => setTo(undefined)} />}
      <li>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Clear all
        </Button>
      </li>
    </ul>
  )
}
