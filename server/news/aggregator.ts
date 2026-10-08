import type { NewsRequest } from '@shared/api'
import { matchesAuthor } from '@shared/authors'
import type { Article, NewsProvider, ProviderFailure, ProviderId } from '@shared/news'
import { MAX_PAGE, type AggregatedPage, type PageCursor } from '@shared/pagination'
import { UpstreamError } from '../http/fetchJson'

const byNewest = (a: Article, b: Article) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)

const isWrittenBy = (article: Article, authors: string[]) =>
  authors.length === 0 || matchesAuthor(article.author, authors)

// articles by followed authors come first, then newest first
const rank = (article: Article, followed: string[]) =>
  followed.length > 0 && matchesAuthor(article.author, followed) ? 0 : 1

// two queries can find the same article, keep the first (best ranked) one
const uniqueByUrl = (articles: Article[]): Article[] => {
  const seen = new Set<string>()
  return articles.filter((article) => {
    const key = article.url || article.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export interface NewsAggregator {
  readonly providers: readonly NewsProvider[]
  search: (request: NewsRequest, cursor: PageCursor, signal?: AbortSignal) => Promise<AggregatedPage>
}

export const createNewsAggregator = (providers: readonly NewsProvider[]): NewsAggregator => ({
  providers,
  search: async ({ queries, providerIds }, { page, exhausted }, signal) => {
    const active =
      providerIds.length > 0 ? providers.filter((p) => providerIds.includes(p.id)) : providers

    // authors the reader follows, in any of the queries
    const followed = queries.flatMap((query) => query.authors)

    const jobs = active.flatMap((provider) =>
      queries.map((params, index) => ({ provider, params, key: `${provider.id}:${index}` })),
    )
    const pending = jobs.filter((job) => !exhausted.includes(job.key))

    // allSettled so one source failing doesn't stop the others
    const settled = await Promise.allSettled(
      pending.map((job) => job.provider.search(job.params, page, signal)),
    )
    signal?.throwIfAborted()

    const articles: Article[] = []
    const failures = new Map<ProviderId, ProviderFailure>()
    const nowExhausted = [...exhausted]
    let hasMore = false

    for (const [index, result] of settled.entries()) {
      const job = pending[index]
      if (!job) continue
      if (result.status === 'rejected') {
        failures.set(job.provider.id, {
          provider: job.provider.id,
          // only UpstreamError messages are written for readers, anything else could leak internals
          message:
            result.reason instanceof UpstreamError ? result.reason.message : 'This source is unavailable right now',
        })
        continue
      }
      articles.push(...result.value.articles.filter((a) => isWrittenBy(a, job.params.authors)))
      if (result.value.hasMore) hasMore = true
      else nowExhausted.push(job.key)
    }

    return {
      articles: uniqueByUrl(articles.sort((a, b) => rank(a, followed) - rank(b, followed) || byNewest(a, b))),
      failures: [...failures.values()],
      ...(hasMore && page < MAX_PAGE && { nextCursor: { page: page + 1, exhausted: nowExhausted } }),
    }
  },
})
