import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authorNameSchema, MAX_AUTHOR_LENGTH, MAX_AUTHORS } from '@shared/schemas'

interface Props {
  authors: string[]
  onToggle: (author: string) => void
}

export const AuthorPicker = ({ authors, onToggle }: Props) => {
  const [error, setError] = useState<string>()
  const atLimit = authors.length >= MAX_AUTHORS

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget
          const parsed = authorNameSchema.safeParse(new FormData(form).get('author'))

          if (!parsed.success) return setError('Enter a name up to 80 characters.')
          if (atLimit) return setError(`You can follow up to ${MAX_AUTHORS} authors.`)

          setError(undefined)
          if (!authors.includes(parsed.data)) onToggle(parsed.data)
          form.reset()
        }}
      >
        <Input
          name="author"
          placeholder="Add an author, e.g. Jane Doe"
          aria-label="Add author"
          maxLength={MAX_AUTHOR_LENGTH}
          aria-invalid={Boolean(error)}
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Add author">
          <PlusIcon />
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {authors.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {authors.map((author) => (
            <li key={author}>
              <Badge variant="secondary" className="h-6 gap-1 pr-1">
                {author}
                <button
                  type="button"
                  aria-label={`Remove ${author}`}
                  onClick={() => onToggle(author)}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          You can also follow an author straight from any article card.
        </p>
      )}
    </div>
  )
}
