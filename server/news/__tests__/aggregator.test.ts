import { describe, expect, it } from 'vitest'
// @vitest-environment node
import type { NewsRequest } from '@shared/api'
import type { Article, NewsProvider, ProviderPage, SearchParams } from '@shared/news'
import { FIRST_PAGE, MAX_PAGE, mergePages } from '@shared/pagination'
import { UpstreamError } from '../../http/fetchJson'
import { createNewsAggregator } from '../aggregator'

const article = (id: string, overrides: Partial<Article> = {}): Article => ({
  id,
  provider: 'p',
  title: id,
  summary: '',
  url: `https://example.com/${id}`,
  publisher: 'Pub',
  publishedAt: '2025-01-01T00:00:00Z',
  ...overrides,
})

const provider = (id: string, search: NewsProvider['search']): NewsProvider => ({ id, name: id, search })
const page = (articles: Article[], hasMore = false): ProviderPage => ({ articles, hasMore })

const params: SearchParams = { query: '', categories: [], authors: [] }
const request = (overrides: Partial<NewsRequest> = {}): NewsRequest => ({
  queries: [params],
  providerIds: [],
  ...overrides,
})

describe('createNewsAggregator', () => {
  it('merges providers newest first', async () => {
    const aggregator = createNewsAggregator([
      provider('a', async () => page([article('old', { publishedAt: '2025-01-01T00:00:00Z' })])),
      provider('b', async () => page([article('new', { publishedAt: '2025-02-01T00:00:00Z' })])),
    ])
    const result = await aggregator.search(request(), FIRST_PAGE)
    expect(result.articles.map((a) => a.id)).toEqual(['new', 'old'])
  })

  it('keeps working when one provider fails and reports it', async () => {
    const aggregator = createNewsAggregator([
      provider('good', async () => page([article('ok')])),
      provider('bad', async () => {
        throw new UpstreamError(503, 'boom')
      }),
    ])
    const result = await aggregator.search(request(), FIRST_PAGE)
    expect(result.articles).toHaveLength(1)
    expect(result.failures).toEqual([{ provider: 'bad', message: 'boom' }])
  })

  it('puts articles by followed authors first, then newest first', async () => {
    const aggregator = createNewsAggregator([
      provider('a', async () =>
        page([
          article('newest', { publishedAt: '2025-03-01T00:00:00Z', author: 'Someone Else' }),
          article('theirs-old', { publishedAt: '2025-01-01T00:00:00Z', author: 'Jane Doe' }),
          article('older', { publishedAt: '2025-02-01T00:00:00Z', author: 'Another One' }),
        ]),
      ),
    ])
    const result = await aggregator.search(
      request({
        queries: [
          { query: '', categories: [], authors: [] },
          { query: '', categories: [], authors: ['Jane Doe'] },
        ],
      }),
      FIRST_PAGE,
    )
    expect(result.articles.map((a) => a.id)).toEqual(['theirs-old', 'newest', 'older'])
  })

  describe('relevance order', () => {
    const two = [
      provider('a', async () =>
        page([
          article('a1', { publishedAt: '2025-01-01T00:00:00Z' }),
          article('a2', { publishedAt: '2025-01-02T00:00:00Z' }),
          article('a3', { publishedAt: '2025-01-03T00:00:00Z' }),
        ]),
      ),
      provider('b', async () =>
        page([article('b1', { publishedAt: '2025-02-01T00:00:00Z' }), article('b2', { publishedAt: '2025-02-02T00:00:00Z' })]),
      ),
    ]
    const withSort = (sort: SearchParams['sort']) => request({ queries: [{ ...params, ...(sort && { sort }) }] })

    it('keeps each source in its own order and takes turns between them', async () => {
      const result = await createNewsAggregator(two).search(withSort('relevance'), FIRST_PAGE)
      expect(result.articles.map((a) => a.id)).toEqual(['a1', 'b1', 'a2', 'b2', 'a3'])
    })

    it('still sorts by date when relevance was not asked for', async () => {
      const result = await createNewsAggregator(two).search(withSort(undefined), FIRST_PAGE)
      expect(result.articles.map((a) => a.id)).toEqual(['b2', 'b1', 'a3', 'a2', 'a1'])
    })

    it('puts followed authors first in either mode', async () => {
      const aggregator = createNewsAggregator([
        provider('a', async () => page([article('x'), article('mine', { author: 'Jane Doe' }), article('y')])),
      ])
      const result = await aggregator.search(
        request({ queries: [{ ...params, sort: 'relevance' }, { ...params, authors: ['Jane Doe'] }] }),
        FIRST_PAGE,
      )
      expect(result.articles[0]?.id).toBe('mine')
    })
  })

  it('hides internal error details behind a generic message', async () => {
    const aggregator = createNewsAggregator([
      provider('bad', async () => {
        throw new TypeError("Cannot read properties of undefined (reading 'results')")
      }),
    ])
    const result = await aggregator.search(request(), FIRST_PAGE)
    expect(result.failures).toEqual([{ provider: 'bad', message: 'This source is unavailable right now' }])
  })

  it('only queries the requested providers', async () => {
    const calls: string[] = []
    const make = (id: string) =>
      provider(id, async () => {
        calls.push(id)
        return page([])
      })
    await createNewsAggregator([make('a'), make('b')]).search(request({ providerIds: ['b'] }), FIRST_PAGE)
    expect(calls).toEqual(['b'])
  })

  it('advances the cursor and stops asking exhausted providers', async () => {
    const calls: string[] = []
    const aggregator = createNewsAggregator([
      provider('short', async (_p, pageNo) => {
        calls.push(`short:${pageNo}`)
        return page([article(`s${pageNo}`)], false)
      }),
      provider('long', async (_p, pageNo) => {
        calls.push(`long:${pageNo}`)
        return page([article(`l${pageNo}`)], pageNo < 2)
      }),
    ])

    const first = await aggregator.search(request(), FIRST_PAGE)
    expect(first.nextCursor).toEqual({ page: 2, exhausted: ['short:0'] })

    if (!first.nextCursor) throw new Error('expected a next page')
    const second = await aggregator.search(request(), first.nextCursor)
    expect(calls).toEqual(['short:1', 'long:1', 'long:2'])
    expect(second.nextCursor).toBeUndefined()
  })

  it('post-filters by author for author queries', async () => {
    const aggregator = createNewsAggregator([
      provider('a', async () =>
        page([article('mine', { author: 'Jane Doe and John Roe' }), article('other', { author: 'Someone Else' })]),
      ),
    ])
    const result = await aggregator.search(
      request({ queries: [{ ...params, authors: ['jane doe'] }] }),
      FIRST_PAGE,
    )
    expect(result.articles.map((a) => a.id)).toEqual(['mine'])
  })

  it('stops offering more pages once the cap is reached', async () => {
    const aggregator = createNewsAggregator([provider('a', async () => page([article('x')], true))])
    const result = await aggregator.search(request(), { page: MAX_PAGE, exhausted: [] })
    expect(result.nextCursor).toBeUndefined()
  })

  it('propagates cancellation instead of reporting provider failures', async () => {
    const controller = new AbortController()
    const aggregator = createNewsAggregator([
      provider('a', async () => {
        controller.abort()
        throw new Error('aborted')
      }),
    ])
    await expect(aggregator.search(request(), FIRST_PAGE, controller.signal)).rejects.toBeDefined()
  })
})

describe('mergePages', () => {
  it('drops duplicate stories by url and keeps unique failures', () => {
    const merged = mergePages([
      { articles: [article('a'), article('b')], failures: [{ provider: 'x', message: '1' }] },
      { articles: [article('a'), article('c')], failures: [{ provider: 'x', message: '2' }] },
    ])
    expect(merged.articles.map((a) => a.id)).toEqual(['a', 'b', 'c'])
    expect(merged.failures).toEqual([{ provider: 'x', message: '2' }])
  })
})
