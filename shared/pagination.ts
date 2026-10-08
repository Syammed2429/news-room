import type { Article, ProviderFailure, ProviderId } from './news'

// where we are in the results, each provider/query pair can run out on its own
export interface PageCursor {
  page: number
  // "providerId:queryIndex" keys with nothing left
  exhausted: string[]
}

export interface AggregatedPage {
  articles: Article[]
  failures: ProviderFailure[]
  nextCursor?: PageCursor
}

// the most pages the UI loads, and the most the server will serve
export const MAX_PAGE = 10

export const FIRST_PAGE: PageCursor = { page: 1, exhausted: [] }

// merges the loaded pages and drops duplicate stories
export const mergePages = (
  pages: AggregatedPage[],
): { articles: Article[]; failures: ProviderFailure[] } => {
  const seen = new Set<string>()
  const articles = pages
    .flatMap((page) => page.articles)
    .filter((article) => {
      const key = article.url || article.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  const failures = new Map<ProviderId, ProviderFailure>()
  pages.flatMap((page) => page.failures).forEach((failure) => failures.set(failure.provider, failure))
  return { articles, failures: [...failures.values()] }
}
