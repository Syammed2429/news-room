import { PreferencesSheet } from '@/features/preferences/PreferencesSheet'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import { usePreferencesStore } from '@/store/preferences'
import { useSearchStore } from '@/store/search'
import { MAX_PAGE } from '@shared/pagination'
import { SortToggle } from '@/features/search/SortToggle'
import { ArticleGrid } from './ArticleGrid'
import { NewArticlesPill } from './NewArticlesPill'
import { ArticleSkeletons } from './ArticleSkeletons'
import { SavedArticles } from './SavedArticles'
import { EmptyState, EndNote, ErrorState, FailureBanner, FeedEmptyState, PersonalizePrompt } from './Notices'
import { ScrollSentinel } from './ScrollSentinel'

export const ResultsView = () => {
  const resetAll = useSearchStore((s) => s.resetAll)
  const view = useSearchStore((s) => s.view)
  const query = useSearchStore((s) => s.query)
  const setView = useSearchStore((s) => s.setView)
  const followed = usePreferencesStore((s) => s.authors)
  const feed = useNewsFeed()

  if (view === 'saved') return <SavedArticles />
  if (feed.needsPreferences) return <PersonalizePrompt action={<PreferencesSheet />} />
  if (feed.isLoading) return <ArticleSkeletons />
  if (feed.isError && feed.articles.length === 0) {
    return <ErrorState onRetry={feed.refetch} message={feed.errorMessage} />
  }

  if (feed.articles.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <FailureBanner failures={feed.failures} />
        {feed.failures.length > 0 ? (
          <ErrorState onRetry={feed.refetch} />
        ) : view === 'feed' && !query ? (
          <FeedEmptyState authors={followed} onShowLatest={() => setView('latest')} />
        ) : (
          <EmptyState onClear={resetAll} />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <FailureBanner failures={feed.failures} />
      <NewArticlesPill count={feed.newCount} onShow={feed.showNew} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {feed.articles.length} {feed.articles.length === 1 ? 'article' : 'articles'}
        </p>
        {query && <SortToggle />}
      </div>
      <ArticleGrid articles={feed.articles} dimmed={feed.isRefreshing} topStory={view === 'latest' && !query} />
      {feed.isFetchingMore && <ArticleSkeletons count={3} />}
      {feed.hasMore ? (
        <ScrollSentinel onReach={() => feed.loadMore()} disabled={feed.isFetchingMore} />
      ) : (
        <EndNote capped={feed.pageCount >= MAX_PAGE} failed={feed.failures.length > 0} />
      )}
    </div>
  )
}
