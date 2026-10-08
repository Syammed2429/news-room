import type { NewsProvider, ProviderPage } from '@shared/news'
import type { TtlCache } from './cache'

// One cache shared by every reader, so a popular search costs a single upstream call.
// The abort signal isn't passed on: the result is shared, and one reader leaving
// shouldn't cancel it for everyone else.
export const withCache = (provider: NewsProvider, cache: TtlCache<ProviderPage>): NewsProvider => ({
  id: provider.id,
  name: provider.name,
  search: (params, page) =>
    cache.getOrLoad(`${provider.id}|${page}|${JSON.stringify(params)}`, () =>
      provider.search(params, page),
    ),
})
