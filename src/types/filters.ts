import type { Category, ProviderId } from '@shared/news'

export type { Preferences } from '@shared/schemas'

export interface ArticleFilters {
  query: string
  category: Category | null
  providerIds: ProviderId[] // empty = all sources
  from?: string
  to?: string
}
