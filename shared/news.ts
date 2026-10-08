export const CATEGORIES = [
  'world',
  'politics',
  'business',
  'technology',
  'science',
  'health',
  'sports',
  'entertainment',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  world: 'World',
  politics: 'Politics',
  business: 'Business',
  technology: 'Technology',
  science: 'Science',
  health: 'Health',
  sports: 'Sports',
  entertainment: 'Entertainment',
}

export type ProviderId = string

export const SORTS = ['newest', 'relevance'] as const

export type Sort = (typeof SORTS)[number]

// one article, whichever source it came from
export interface Article {
  id: string
  provider: ProviderId
  title: string
  summary: string
  // http(s) only, checked on the server
  url: string
  // https only
  imageUrl?: string
  // who published it, e.g. "BBC News"
  publisher: string
  // the source's own section name
  section?: string
  author?: string
  // ISO 8601
  publishedAt: string
}

export interface SearchParams {
  query: string
  categories: Category[]
  // only articles by one of these authors
  authors: string[]
  // newest first (the default), or each source's own idea of the best match
  sort?: Sort
  // yyyy-MM-dd, inclusive
  from?: string
  // yyyy-MM-dd, inclusive
  to?: string
}

export interface ProviderPage {
  articles: Article[]
  hasMore: boolean
}

// Every news source implements this. The aggregator only knows this shape, so adding a
// source doesn't touch anything that exists.
export interface NewsProvider {
  readonly id: ProviderId
  readonly name: string
  // page starts at 1
  search: (params: SearchParams, page: number, signal?: AbortSignal) => Promise<ProviderPage>
}

export interface ProviderFailure {
  provider: ProviderId
  message: string
}
