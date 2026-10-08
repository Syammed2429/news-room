import { motion } from 'motion/react'
import { PreferencesSheet } from '@/features/preferences/PreferencesSheet'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/store/preferences'
import { useSearchStore } from '@/store/search'
import { ArticleCard } from './ArticleCard'
import { ArticleSkeletons } from './ArticleSkeletons'
import { EmptyState, ErrorState, FailureBanner, FeedEmptyState, PersonalizePrompt } from './Notices'
import { ScrollSentinel } from './ScrollSentinel'

export const ResultsView = () => {
  const resetAll = useSearchStore((s) => s.resetAll)
  const view = useSearchStore((s) => s.view)
  const query = useSearchStore((s) => s.query)
  const setView = useSearchStore((s) => s.setView)
  const followed = usePreferencesStore((s) => s.authors)
  const feed = useNewsFeed()

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
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {feed.articles.length} {feed.articles.length === 1 ? 'article' : 'articles'}
      </p>
      <motion.ul
        className={cn(
          'grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3',
          feed.isRefreshing && 'opacity-50',
        )}
      >
        {feed.articles.map((article, index) => {
          // only feature a top story on the plain timeline
          const isLead = index === 0 && view === 'latest' && !query && Boolean(article.imageUrl)
          return (
            <li key={article.id} className={cn(isLead && 'sm:col-span-2 xl:col-span-3')}>
              <ArticleCard article={article} index={index} variant={isLead ? 'lead' : 'default'} />
            </li>
          )
        })}
      </motion.ul>
      {feed.isFetchingMore && <ArticleSkeletons count={3} />}
      {feed.hasMore ? (
        <ScrollSentinel onReach={() => feed.loadMore()} disabled={feed.isFetchingMore} />
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">You're all caught up.</p>
      )}
    </div>
  )
}
