import { BookmarkIcon } from 'lucide-react'
import { useSavedStore } from '@/store/saved'
import { useSearchStore } from '@/store/search'
import { MAX_SAVED } from '@shared/schemas'
import { ArticleGrid } from './ArticleGrid'
import { CenteredState } from './Notices'
import { Button } from '@/components/ui/button'

// Everything here comes from this device, there is no request to the server.
export const SavedArticles = () => {
  const articles = useSavedStore((s) => s.articles)
  const setView = useSearchStore((s) => s.setView)

  if (articles.length === 0) {
    return (
      <CenteredState
        icon={<BookmarkIcon aria-hidden />}
        title="Nothing saved yet"
        description="Tap the bookmark on any article to keep it here for later."
        action={
          <Button variant="outline" onClick={() => setView('latest')}>
            Browse the latest news
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {articles.length} saved {articles.length === 1 ? 'article' : 'articles'}
        {articles.length >= MAX_SAVED && `. The list is full, so saving another removes the oldest.`}
      </p>
      <ArticleGrid articles={articles} />
    </div>
  )
}
