import { SearchIcon, XIcon } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { useRecentStore } from '@/store/recent'
import { useSearchStore } from '@/store/search'
import { MAX_QUERY_LENGTH, queryTextSchema } from '@shared/schemas'

// Every new query goes to three APIs and NYT only allows about 5 requests a minute,
// so wait for a pause in typing and skip single letters.
const DEBOUNCE_MS = 500
const MIN_LENGTH = 2

export const SearchBar = () => {
  const draft = useSearchStore((s) => s.draft)
  const setDraft = useSearchStore((s) => s.setDraft)
  const setQuery = useSearchStore((s) => s.setQuery)
  const clearSearch = useSearchStore((s) => s.clearSearch)
  const inputRef = useRef<HTMLInputElement>(null)

  const apply = (value: string) => {
    const parsed = queryTextSchema.safeParse(value)
    setQuery(parsed.success ? parsed.data : '')
  }

  // only finished searches are kept, not every half-typed word the debounce happened to catch
  const remember = (value: string) => {
    const parsed = queryTextSchema.safeParse(value)
    if (parsed.success && parsed.data.length >= MIN_LENGTH) useRecentStore.getState().add(parsed.data)
  }

  const debounced = useDebouncedCallback(() => {
    // read the box when the timer fires, so text cleared in the meantime isn't searched
    const value = useSearchStore.getState().draft
    const length = value.trim().length
    // empty clears the search, a lone letter is ignored
    if (length === 0 || length >= MIN_LENGTH) apply(value)
  }, DEBOUNCE_MS)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        debounced.cancel()
        apply(draft) // Enter doesn't wait
        remember(draft)
      }}
    >
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          name="q"
          type="text"
          enterKeyHint="search"
          maxLength={MAX_QUERY_LENGTH}
          value={draft}
          // leaving the box means the reader is done typing, which is when a search is worth keeping
          onBlur={() => remember(draft)}
          onChange={(event) => {
            setDraft(event.target.value)
            debounced.run()
          }}
          placeholder="Search articles"
          aria-label="Search articles"
          className="h-10 pr-9 pl-9"
        />
        {draft && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={() => {
              debounced.cancel()
              clearSearch()
              inputRef.current?.focus()
            }}
          >
            <XIcon />
          </Button>
        )}
      </div>
    </form>
  )
}
