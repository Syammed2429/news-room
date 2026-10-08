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

export const buildFeedRequest = (preferences: Preferences, search: Pick<ArticleFilters, 'query' | 'from' | 'to'>): NewsRequest => {
  const base = { query: search.query, from: search.from, to: search.to }
  const hasAuthors = preferences.authors.length > 0
  const queries: SearchParams[] = []

  // no categories means "everything", so only send this query when categories are set
  // or when it's the only one
  if (preferences.categories.length > 0 || !hasAuthors) {
    queries.push({ ...base, categories: preferences.categories, authors: [] })
  }
  if (hasAuthors) {
    queries.push({ ...base, categories: [], authors: preferences.authors })
  }
  return { queries, providerIds: preferences.providerIds }
}

export const hasPreferences = ({ providerIds, categories, authors }: Preferences) =>
  providerIds.length + categories.length + authors.length > 0
