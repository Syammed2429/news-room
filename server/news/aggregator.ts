import type { NewsRequest } from '@shared/api'
import { matchesAuthor } from '@shared/authors'
import type { Article, NewsProvider, ProviderFailure, ProviderId } from '@shared/news'
import { MAX_PAGE, type AggregatedPage, type PageCursor } from '@shared/pagination'
import { UpstreamError } from '../http/fetchJson'
import { searchText } from './text'

const byNewest = (a: Article, b: Article) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)

const isWrittenBy = (article: Article, authors: string[]) =>
  authors.length === 0 || matchesAuthor(article.author, authors)

// articles by followed authors come first, then newest first
const rank = (article: Article, followed: string[]) =>
  followed.length > 0 && matchesAuthor(article.author, followed) ? 0 : 1

// Sources don't share a relevance score, so there's no honest way to rank across them.
// Keep each source's own order and take one article from each in turn.
const takeTurns = (lists: Article[][]): Article[] => {
  const longest = Math.max(0, ...lists.map((list) => list.length))
  return Array.from({ length: longest }, (_, i) => lists.flatMap((list) => list[i] ?? []))
    .flat()
}

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

    // The text is cleaned once here for every source. A search made only of characters that
    // can't be searched (an emoji, say) finds nothing, rather than turning into "show everything".
    const jobs = active.flatMap((provider) =>
      queries.flatMap((params, index) => {
        const query = searchText(params.query)
        return params.query && !query ? [] : [{ provider, params: { ...params, query }, key: `${provider.id}:${index}` }]
      }),
    )
    const pending = jobs.filter((job) => !exhausted.includes(job.key))

    // allSettled so one source failing doesn't stop the others
    const settled = await Promise.allSettled(
      pending.map((job) => job.provider.search(job.params, page, signal)),
    )
    signal?.throwIfAborted()

    const byJob: Article[][] = []
    const relevance = queries.some((query) => query.sort === 'relevance')
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
      byJob.push(result.value.articles.filter((a) => isWrittenBy(a, job.params.authors)))
      if (result.value.hasMore) hasMore = true
      else nowExhausted.push(job.key)
    }

    // followed authors first, then either each source's own order or newest first
    const merged = relevance ? takeTurns(byJob) : byJob.flat().sort(byNewest)
    merged.sort((a, b) => rank(a, followed) - rank(b, followed))

    return {
      articles: uniqueByUrl(merged),
      failures: [...failures.values()],
      ...(hasMore && page < MAX_PAGE && { nextCursor: { page: page + 1, exhausted: nowExhausted } }),
    }
  },
})
