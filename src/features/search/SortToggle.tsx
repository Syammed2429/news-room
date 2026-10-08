import { Chip } from '@/components/Chip'
import { useSearchStore } from '@/store/search'
import type { Sort } from '@shared/news'

const OPTIONS: { value: Sort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'relevance', label: 'Most relevant' },
]

// Shown while searching. "Most relevant" keeps each source's own ranking, so the sources take turns.
export const SortToggle = () => {
  const sort = useSearchStore((s) => s.sort)
  const setSort = useSearchStore((s) => s.setSort)

  return (
    <div role="group" aria-label="Sort results" className="flex items-center gap-1.5 text-sm">
      {OPTIONS.map(({ value, label }) => (
        <Chip key={value} pressed={sort === value} onClick={() => setSort(value)} className="py-0.5 text-xs">
          {label}
        </Chip>
      ))}
    </div>
  )
}
