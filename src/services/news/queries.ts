import type { ArticleFilters, Preferences } from '@/types/filters'
import type { NewsRequest } from '@shared/api'
import type { SearchParams } from '@shared/news'

export const buildLatestRequest = (filters: ArticleFilters): NewsRequest => {
  return {
    providerIds: filters.providerIds,
    queries: [
      {
        query: filters.query,
        categories: filters.category ? [filters.category] : [],
        authors: [],
        from: filters.from,
        to: filters.to,
      },
    ],
  }
}

// The first query is the base feed (preferred sources and categories). None of the news APIs
// can search by author reliably, so followed authors get a second query and the server sorts
// their articles to the top. The base query is always there so the feed is never empty
// just because a followed author hasn't published recently.
export const buildFeedRequest = (
  preferences: Preferences,
  search: Pick<ArticleFilters, 'query' | 'from' | 'to'>,
): NewsRequest => {
  const base = { query: search.query, from: search.from, to: search.to }
  const queries: SearchParams[] = [{ ...base, categories: preferences.categories, authors: [] }]
  if (preferences.authors.length > 0) {
    queries.push({ ...base, categories: [], authors: preferences.authors })
  }
  return { queries, providerIds: preferences.providerIds }
}

export const hasPreferences = ({ providerIds, categories, authors }: Preferences) =>
  providerIds.length + categories.length + authors.length > 0
