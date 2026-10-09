import { withinCategories, withinSources } from '@/lib/filters'
import type { ArticleFilters, Preferences } from '@/types/filters'
import type { NewsRequest } from '@shared/api'
import type { SearchParams, Sort } from '@shared/news'

// the reader's choice only counts while there is something to rank
const effectiveSort = ({ query, sort }: Pick<ArticleFilters, 'query' | 'sort'>): Sort =>
  query ? sort : 'newest'

export const buildLatestRequest = (filters: ArticleFilters): NewsRequest => {
  return {
    providerIds: filters.providerIds,
    queries: [
      {
        query: filters.query,
        categories: filters.category ? [filters.category] : [],
        authors: [],
        sort: effectiveSort(filters),
        from: filters.from,
        to: filters.to,
      },
    ],
  }
}

// The feed is a union: articles in the preferred categories, plus articles by the preferred
// authors. Authors get their own query because the APIs have no author filter. If only authors
// are picked, there is no category query, so the feed holds just those authors.
// The reader's own category and source filters narrow all of that, they never widen it.
export const buildFeedRequest = (
  preferences: Preferences,
  search: Pick<ArticleFilters, 'query' | 'sort' | 'from' | 'to' | 'category' | 'providerIds'>,
): NewsRequest => {
  const base = { query: search.query, sort: effectiveSort(search), from: search.from, to: search.to }
  const chosenCategory = withinCategories(search.category, preferences.categories)
  const hasAuthors = preferences.authors.length > 0
  const queries: SearchParams[] = []

  // no categories means "everything", so only send this when categories are set,
  // or when it's the only query (sources-only preferences)
  if (preferences.categories.length > 0 || !hasAuthors) {
    queries.push({
      ...base,
      categories: chosenCategory ? [chosenCategory] : preferences.categories,
      authors: [],
    })
  }
  if (hasAuthors) {
    queries.push({ ...base, categories: chosenCategory ? [chosenCategory] : [], authors: preferences.authors })
  }

  const sources = withinSources(search.providerIds, preferences.providerIds)
  return { queries, providerIds: sources.length > 0 ? sources : preferences.providerIds }
}

export const hasPreferences = ({ providerIds, categories, authors }: Preferences) =>
  providerIds.length + categories.length + authors.length > 0
