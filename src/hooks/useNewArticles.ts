import { useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { newsClient } from '@/services/news/newsClient'
import type { NewsRequest } from '@shared/api'
import type { Article } from '@shared/news'
import { FIRST_PAGE, type AggregatedPage, type PageCursor } from '@shared/pagination'

// The server keeps results for 5 minutes, so asking more often would only get the same answer.
export const NEW_ARTICLES_POLL_MS = 5 * 60_000

interface Options {
  request: NewsRequest
  // what is on screen now
  articles: Article[]
  enabled: boolean
}

// Quietly checks whether anything newer than what is on screen has been published.
export const useNewArticles = ({ request, articles, enabled }: Options) => {
  const client = useQueryClient()
  // While a new search is still loading, the list on screen belongs to the previous one,
  // so wait until this request has its own first page to compare against.
  const hasOwnPage = client.getQueryData(['articles', request]) !== undefined

  const fresh = useQuery({
    queryKey: ['fresh', request],
    queryFn: async ({ signal }) => {
      // The list on screen was fetched a moment ago, so the first check can reuse its first page
      // instead of asking the server for the same thing again. Only a stale one costs a request.
      const main = client.getQueryState<InfiniteData<AggregatedPage, PageCursor>>(['articles', request])
      const firstPage = main?.data?.pages[0]
      if (firstPage && Date.now() - main.dataUpdatedAt < NEW_ARTICLES_POLL_MS - 1000) return firstPage
      return newsClient.search(request, FIRST_PAGE, signal)
    },
    enabled: enabled && hasOwnPage,
    staleTime: NEW_ARTICLES_POLL_MS,
    refetchInterval: NEW_ARTICLES_POLL_MS,
    // no point checking while nobody is looking at the tab
    refetchIntervalInBackground: false,
  })

  const onScreen = new Set(articles.map((article) => article.url))
  const count = fresh.data?.articles.filter((article) => !onScreen.has(article.url)).length ?? 0

  const showNew = () => {
    const key = ['articles', request]
    // go back to just the first page, then refresh it: one request instead of one per page
    client.setQueryData<InfiniteData<AggregatedPage, PageCursor>>(key, (data) =>
      data && { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) },
    )
    void client.invalidateQueries({ queryKey: key })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { newCount: count, showNew }
}
