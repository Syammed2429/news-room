import { motion } from 'motion/react'
import { PreferencesSheet } from '@/features/preferences/PreferencesSheet'
import { useNewsFeed } from '@/hooks/useNewsFeed'
import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/store/preferences'
import { useSearchStore } from '@/store/search'
import { matchesAuthor } from '@shared/authors'
import { ArticleCard } from './ArticleCard'
import { ArticleSkeletons } from './ArticleSkeletons'
import { Banner, EmptyState, ErrorState, FailureBanner, PersonalizePrompt } from './Notices'
import { ScrollSentinel } from './ScrollSentinel'

export const ResultsView = () => {
  const resetAll = useSearchStore((s) => s.resetAll)
  const view = useSearchStore((s) => s.view)
  const query = useSearchStore((s) => s.query)
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
        {feed.failures.length > 0 ? <ErrorState onRetry={feed.refetch} /> : <EmptyState onClear={resetAll} />}
      </div>
    )
  }

  // the APIs can't search by author, so say so when none of them turned up
  const noFollowedAuthors =
    view === 'feed' && followed.length > 0 && !feed.articles.some((a) => matchesAuthor(a.author, followed))

  return (
    <div className="flex flex-col gap-4">
      <FailureBanner failures={feed.failures} />
      {noFollowedAuthors && (
        <Banner>
          No recent articles by {followed.join(', ')}. The news sources can't search by author, so we
          only find them when they publish in your sources. Here is the latest news instead.
        </Banner>
      )}
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
