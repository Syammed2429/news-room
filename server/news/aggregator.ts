import type { NewsRequest } from '@shared/api'
import type { Article, NewsProvider, ProviderFailure, ProviderId } from '@shared/news'
import { MAX_PAGE, type AggregatedPage, type PageCursor } from '@shared/pagination'
import { UpstreamError } from '../http/fetchJson'
import { includesIgnoreCase } from './text'

const byNewest = (a: Article, b: Article) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)

const isWrittenBy = (article: Article, authors: string[]) =>
  authors.length === 0 || authors.some((author) => includesIgnoreCase(article.author, author))

export interface NewsAggregator {
  readonly providers: readonly NewsProvider[]
  search: (request: NewsRequest, cursor: PageCursor, signal?: AbortSignal) => Promise<AggregatedPage>
}

export const createNewsAggregator = (providers: readonly NewsProvider[]): NewsAggregator => ({
  providers,
  search: async ({ queries, providerIds }, { page, exhausted }, signal) => {
    const active =
      providerIds.length > 0 ? providers.filter((p) => providerIds.includes(p.id)) : providers

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
      articles: articles.sort(byNewest),
      failures: [...failures.values()],
      ...(hasMore && page < MAX_PAGE && { nextCursor: { page: page + 1, exhausted: nowExhausted } }),
    }
  },
})
