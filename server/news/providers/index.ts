import type { NewsProvider, ProviderPage } from '@shared/news'
import { createTtlCache } from '../cache'
import { withCache } from '../cachedProvider'
import { createGuardianProvider } from './guardian'
import { createMockProvider } from './mock'
import { createNewsApiProvider } from './newsapi'
import { createNytProvider } from './nyt'

export interface ApiKeys {
  guardian?: string | undefined
  nyt?: string | undefined
  newsApi?: string | undefined
}

// one provider for each key that is set
export const createProviders = ({ guardian, nyt, newsApi }: ApiKeys): NewsProvider[] =>
  [
    guardian && createGuardianProvider(guardian),
    nyt && createNytProvider(nyt),
    newsApi && createNewsApiProvider(newsApi),
  ].filter((provider): provider is NewsProvider => Boolean(provider))

// fake sources for when there are no keys
export const createDemoProviders = (): NewsProvider[] => [
  createMockProvider('demo-wire', 'Demo Wire', 0),
  createMockProvider('demo-times', 'Demo Times', 2),
  createMockProvider('demo-daily', 'Demo Daily', 5),
]

interface CacheSettings {
  ttlMs: number
  errorTtlMs: number
  maxEntries: number
}

// all providers share one cache
export const cacheProviders = (providers: NewsProvider[], settings: CacheSettings): NewsProvider[] => {
  const cache = createTtlCache<ProviderPage>(settings)
  return providers.map((provider) => withCache(provider, cache))
}
