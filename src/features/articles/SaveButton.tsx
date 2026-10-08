import { BookmarkIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSavedStore } from '@/store/saved'
import type { Article } from '@shared/news'

export const SaveButton = ({ article }: { article: Article }) => {
  const saved = useSavedStore((s) => s.articles.some((item) => item.id === article.id))
  const toggle = useSavedStore((s) => s.toggle)
  const action = saved ? 'Remove from saved' : 'Save for later'

  return (
    <button
      type="button"
      onClick={() => toggle(article)}
      aria-pressed={saved}
      aria-label={`${action}: ${article.title}`}
      title={action}
      className={cn(
        // sits above the card's full-size link, and is big enough to tap
        'relative z-10 grid size-7 shrink-0 place-items-center rounded-md outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
        saved ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <BookmarkIcon aria-hidden className={cn('size-4', saved && 'fill-current')} />
    </button>
  )
}
