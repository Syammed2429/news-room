import type { Category, ProviderId, Sort } from '@shared/news'

export type { Preferences } from '@shared/schemas'

export interface ArticleFilters {
  query: string
  category: Category | null
  providerIds: ProviderId[] // empty = all sources
  // only matters while searching, without a search everything is newest first
  sort: Sort
  from?: string
  to?: string
}
