import { HistoryIcon } from 'lucide-react'
import { Chip } from '@/components/Chip'
import { Button } from '@/components/ui/button'
import { useRecentStore } from '@/store/recent'
import { useSearchStore } from '@/store/search'

// Quick ways back to earlier searches. Only shown while the search box is empty.
export const RecentSearches = () => {
  const searches = useRecentStore((s) => s.searches)
  const clear = useRecentStore((s) => s.clear)
  const draft = useSearchStore((s) => s.draft)
  const { setDraft, setQuery } = useSearchStore.getState()

  if (draft !== '' || searches.length === 0) return null

  return (
    <div role="group" aria-label="Recent searches" className="flex flex-wrap items-center gap-2">
      <HistoryIcon aria-hidden className="size-4 text-muted-foreground" />
      {searches.map((search) => (
        <Chip
          key={search}
          pressed={false}
          onClick={() => {
            setDraft(search)
            setQuery(search)
          }}
          className="py-0.5 text-xs"
        >
          {search}
        </Chip>
      ))}
      <Button variant="ghost" size="xs" onClick={clear}>
        Clear
      </Button>
    </div>
  )
}
