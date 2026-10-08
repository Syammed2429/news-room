import { SearchIcon, XIcon } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSearchStore } from '@/store/search'
import { MAX_QUERY_LENGTH, queryTextSchema } from '@shared/schemas'

export const SearchBar = () => {
  const query = useSearchStore((s) => s.query)
  const setQuery = useSearchStore((s) => s.setQuery)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <form
      role="search"
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        const parsed = queryTextSchema.safeParse(new FormData(event.currentTarget).get('q'))
        setQuery(parsed.success ? parsed.data : '')
      }}
    >
      <div className="relative flex-1">
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
          defaultValue={query}
          placeholder="Search articles"
          aria-label="Search articles"
          className="h-10 pr-9 pl-9"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 -translate-y-1/2"
            onClick={() => {
              setQuery('')
              if (inputRef.current) inputRef.current.value = ''
              inputRef.current?.focus()
            }}
          >
            <XIcon />
          </Button>
        )}
      </div>
      <Button type="submit" size="lg" className="h-10 px-4">
        Search
      </Button>
    </form>
  )
}
