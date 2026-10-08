import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { FIRST_PAGE, mergePages, type AggregatedPage } from '@shared/pagination'
import { newsClient } from '@/services/news/newsClient'
import { buildFeedRequest, buildLatestRequest, hasPreferences } from '@/services/news/queries'
import { usePreferencesStore } from '@/store/preferences'
import { useSearchStore } from '@/store/search'

const selectArticles = (data: { pages: AggregatedPage[] }) => ({
  ...mergePages(data.pages),
  pageCount: data.pages.length,
})

export const useNewsFeed = () => {
  const { view, query, category, providerIds, sort, from, to } = useSearchStore()
  const { providerIds: preferredProviders, categories, authors } = usePreferencesStore()

  const preferences = { providerIds: preferredProviders, categories, authors }
  const request =
    view === 'feed'
      ? buildFeedRequest(preferences, { query, sort, from, to })
      : buildLatestRequest({ query, category, providerIds, sort, from, to })

  const needsPreferences = view === 'feed' && !hasPreferences(preferences)

  const result = useInfiniteQuery({
    queryKey: ['articles', request],
    queryFn: ({ pageParam, signal }) => newsClient.search(request, pageParam, signal),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: selectArticles,
    // the saved tab reads from this device, it never asks the server
    enabled: !needsPreferences && view !== 'saved',
    placeholderData: keepPreviousData,
  })

  return {
    articles: result.data?.articles ?? [],
    failures: result.data?.failures ?? [],
    pageCount: result.data?.pageCount ?? 0,
    needsPreferences,
    isLoading: result.isLoading,
    isRefreshing: result.isPlaceholderData,
    isFetchingMore: result.isFetchingNextPage,
    hasMore: result.hasNextPage,
    isError: result.isError,
    errorMessage: result.error?.message,
    loadMore: result.fetchNextPage,
    refetch: result.refetch,
  }
}
