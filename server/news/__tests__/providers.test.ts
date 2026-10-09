import { afterEach, describe, expect, it, vi } from 'vitest'
// @vitest-environment node
import type { SearchParams } from '@shared/news'
import { createGuardianProvider } from '../providers/guardian'
import { createNewsApiProvider } from '../providers/newsapi'
import { createNytProvider } from '../providers/nyt'

const base: SearchParams = { query: '', categories: [], authors: [] }

const stubFetch = (body: unknown, status = 200) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  const lastUrl = () => new URL(String((fetchMock.mock.calls.at(-1) as unknown[])[0]))
  const lastInit = () => (fetchMock.mock.calls.at(-1) as unknown[])[1] as RequestInit | undefined
  return { fetchMock, lastUrl, lastInit }
}

afterEach(() => vi.unstubAllGlobals())

describe('guardian provider', () => {
  const payload = {
    response: {
      currentPage: 1,
      pages: 3,
      results: [
        {
          id: 'tech/1',
          webTitle: 'Hello',
          webUrl: 'https://g.example/1',
          webPublicationDate: '2025-01-02T00:00:00Z',
          sectionName: 'Technology',
          fields: { thumbnail: 'https://img/1.jpg', trailText: '<b>Trail</b> &amp; text', byline: 'Jane Doe' },
        },
      ],
    },
  }

  it('maps results to normalized articles', async () => {
    stubFetch(payload)
    const result = await createGuardianProvider('k').search(base, 1)
    expect(result.hasMore).toBe(true)
    expect(result.articles[0]).toMatchObject({
      id: 'guardian:tech/1',
      title: 'Hello',
      summary: 'Trail & text',
      author: 'Jane Doe',
      publisher: 'The Guardian',
      section: 'Technology',
    })
  })

  it('uses the contributor names instead of a byline that has job titles in it', async () => {
    stubFetch({
      response: {
        currentPage: 1,
        pages: 1,
        results: [
          {
            ...payload.response.results[0],
            fields: { byline: 'Dan Sabbagh Defence and security editor' },
            tags: [{ webTitle: 'Dan Sabbagh' }],
          },
        ],
      },
    })
    const [article] = (await createGuardianProvider('k').search(base, 1)).articles
    expect(article?.author).toBe('Dan Sabbagh')
  })

  it('sends filters in the Guardian vocabulary', async () => {
    const { lastUrl } = stubFetch(payload)
    await createGuardianProvider('k').search(
      { query: 'ai', categories: ['sports', 'health'], authors: ['Jane Doe'], from: '2025-01-01', to: '2025-01-31' },
      2,
    )
    const params = lastUrl().searchParams
    expect(params.get('section')).toBe('sport|society')
    expect(params.get('from-date')).toBe('2025-01-01')
    expect(params.get('to-date')).toBe('2025-01-31')
    expect(params.get('q')).toBe('(ai) AND ("Jane Doe")')
    expect(params.get('page')).toBe('2')
    expect(params.get('api-key')).toBe('k')
  })
})

describe('nyt provider', () => {
  const payload = {
    response: {
      metadata: { hits: 25 },
      docs: [
        {
          _id: 'nyt://1',
          web_url: 'https://nyt.example/1',
          abstract: 'Abstract',
          headline: { main: 'Headline' },
          byline: { original: 'By Jane Doe' },
          pub_date: '2025-01-02T00:00:00+0000',
          section_name: 'Science',
          multimedia: [{ url: 'images/a.jpg', subtype: 'thumbnail' }],
        },
      ],
    },
  }

  it('maps docs, stripping the byline prefix and resolving image urls', async () => {
    stubFetch(payload)
    const result = await createNytProvider('k').search(base, 1)
    expect(result.articles[0]).toMatchObject({
      author: 'Jane Doe',
      imageUrl: 'https://www.nytimes.com/images/a.jpg',
      summary: 'Abstract',
    })
    expect(result.hasMore).toBe(true)
  })

  it('uses 0-based pages, compact dates and puts category words into q', async () => {
    const { lastUrl } = stubFetch(payload)
    await createNytProvider('k').search(
      { query: 'ai', categories: ['world', 'sports'], authors: ['Jane Doe'], from: '2025-01-01', to: '2025-01-31' },
      3,
    )
    const params = lastUrl().searchParams
    expect(params.get('page')).toBe('2')
    expect(params.get('begin_date')).toBe('20250101')
    expect(params.get('end_date')).toBe('20250131')
    expect(params.get('q')).toBe('ai world sports')
    expect(params.has('fq')).toBe(false)
  })

  it('does not send author names, since q only finds articles that mention them', async () => {
    const { lastUrl } = stubFetch(payload)
    await createNytProvider('k').search({ ...base, authors: ['Jane Doe'] }, 1)
    expect(lastUrl().searchParams.has('q')).toBe(false)
    expect(lastUrl().searchParams.get('sort')).toBe('newest')
  })

  it('treats the null docs NYT returns for empty results as no articles', async () => {
    stubFetch({ response: { docs: null, metadata: { hits: 0 } } })
    const result = await createNytProvider('k').search(base, 1)
    expect(result).toEqual({ articles: [], hasMore: false })
  })

  it('reports no more pages after the last one', async () => {
    stubFetch(payload)
    const result = await createNytProvider('k').search(base, 3)
    expect(result.hasMore).toBe(false)
  })
})

describe('newsapi provider', () => {
  const payload = {
    totalResults: 40,
    articles: [
      {
        source: { name: 'BBC News' },
        author: 'Jane Doe',
        title: 'Headline',
        description: 'Desc',
        url: 'https://bbc.example/1',
        urlToImage: null,
        publishedAt: '2025-01-02T00:00:00Z',
      },
      {
        source: { name: 'X' },
        author: null,
        title: '[Removed]',
        description: null,
        url: 'https://removed.example',
        urlToImage: null,
        publishedAt: '2025-01-02T00:00:00Z',
      },
    ],
  }

  it('maps articles, keeps the real publisher and drops removed items', async () => {
    stubFetch(payload)
    const result = await createNewsApiProvider('k').search(base, 1)
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0]).toMatchObject({ publisher: 'BBC News', provider: 'newsapi', author: 'Jane Doe' })
  })

  it('calls NewsAPI directly and sends the key in a header, never in the URL', async () => {
    const { lastUrl, lastInit } = stubFetch(payload)
    await createNewsApiProvider('secret').search(base, 1)
    expect(lastUrl().origin + lastUrl().pathname).toBe('https://newsapi.org/v2/top-headlines')
    expect(lastUrl().href).not.toContain('secret')
    const headers = lastInit()?.headers as Record<string, string> | undefined
    expect(headers?.['X-Api-Key']).toBe('secret')
  })

  it('uses top-headlines with one request per category', async () => {
    const { fetchMock } = stubFetch(payload)
    await createNewsApiProvider('k').search({ ...base, categories: ['business', 'sports'] }, 1)
    const urls = fetchMock.mock.calls.map((c) => new URL(String((c as unknown[])[0])))
    expect(urls.map((u) => u.searchParams.get('category'))).toEqual(['business', 'sports'])
  })

  it('switches to everything for date ranges, which top-headlines cannot filter', async () => {
    const { lastUrl } = stubFetch(payload)
    await createNewsApiProvider('k').search({ ...base, query: 'ai', from: '2025-01-01' }, 1)
    expect(lastUrl().pathname).toBe('/v2/everything')
    expect(lastUrl().searchParams.get('from')).toBe('2025-01-01')
  })

  it('searches everything, not just the US headlines, when there is a keyword', async () => {
    const { lastUrl } = stubFetch(payload)
    await createNewsApiProvider('k').search({ ...base, query: 'climate' }, 1)
    expect(lastUrl().pathname).toBe('/v2/everything')
    expect(lastUrl().searchParams.get('q')).toBe('(climate)')
  })

  it('combines a keyword with a category as keywords on everything', async () => {
    const { lastUrl } = stubFetch(payload)
    await createNewsApiProvider('k').search({ ...base, query: 'ai', categories: ['technology'] }, 1)
    expect(lastUrl().pathname).toBe('/v2/everything')
    expect(lastUrl().searchParams.get('q')).toBe('(ai) AND ("technology")')
  })

  it('falls back to keyword search for categories without a headlines equivalent', async () => {
    const { lastUrl } = stubFetch(payload)
    await createNewsApiProvider('k').search({ ...base, categories: ['politics'] }, 1)
    expect(lastUrl().pathname).toBe('/v2/everything')
    expect(lastUrl().searchParams.get('q')).toBe('("politics")')
  })

  it('scans 100 of the latest when looking for an author, without searching the name', async () => {
    const { lastUrl } = stubFetch({ ...payload, totalResults: 250 })
    const result = await createNewsApiProvider('k').search({ ...base, authors: ['Jane Doe'] }, 1)
    expect(lastUrl().pathname).toBe('/v2/top-headlines')
    expect(lastUrl().searchParams.get('pageSize')).toBe('100')
    expect(lastUrl().searchParams.has('q')).toBe(false)
    // the free plan stops at 100 results, and this request already took all of them
    expect(result.hasMore).toBe(false)
  })

  it('surfaces rate limiting as a readable error', async () => {
    stubFetch({}, 429)
    await expect(createNewsApiProvider('k').search(base, 1)).rejects.toThrow(/rate limit/i)
  })
})

describe('untrusted upstream data', () => {
  const guardianWith = (result: Record<string, unknown>) => ({
    response: {
      currentPage: 1,
      pages: 1,
      results: [
        {
          id: 'x',
          webTitle: 'T',
          webPublicationDate: '2025-01-02T00:00:00Z',
          webUrl: 'https://g.example/x',
          ...result,
        },
      ],
    },
  })

  it('drops articles whose link is not http(s)', async () => {
    stubFetch(guardianWith({ webUrl: 'javascript:alert(1)' }))
    const result = await createGuardianProvider('k').search(base, 1)
    expect(result.articles).toEqual([])
  })

  it('drops non-https images but keeps the article', async () => {
    stubFetch(guardianWith({ fields: { thumbnail: 'http://insecure.example/a.jpg' } }))
    const [article] = (await createGuardianProvider('k').search(base, 1)).articles
    expect(article?.imageUrl).toBeUndefined()
    expect(article?.title).toBe('T')
  })

  it('strips markup from summaries', async () => {
    stubFetch(guardianWith({ fields: { trailText: '<img src=x onerror=alert(1)>Hi <b>there</b>' } }))
    const [article] = (await createGuardianProvider('k').search(base, 1)).articles
    expect(article?.summary).toBe('Hi there')
  })

  it('cannot be made to alter the upstream query with quotes in author names', async () => {
    const { lastUrl } = stubFetch(guardianWith({}))
    await createGuardianProvider('k').search({ ...base, authors: ['Jane" OR section:secret OR "x'] }, 1)
    // the quotes are stripped, so it stays one phrase
    expect(lastUrl().searchParams.get('q')).toBe('("Jane OR section:secret OR x")')
  })

  it('never puts the API key into an error message', async () => {
    stubFetch({}, 401)
    const error = await createGuardianProvider('SECRET-KEY').search(base, 1).catch((e: Error) => e)
    expect(String(error)).not.toContain('SECRET-KEY')
    expect((error as Error).message).toBe('The API key was rejected')
  })

  it('refuses redirects so a key cannot be forwarded to another host', async () => {
    const { fetchMock } = stubFetch(guardianWith({}))
    await createGuardianProvider('k').search(base, 1)
    expect((fetchMock.mock.calls[0] as unknown[])[1]).toMatchObject({ redirect: 'error' })
  })
})

describe('sort order', () => {
  const guardianPayload = { response: { currentPage: 1, pages: 1, results: [] } }
  const nytPayload = { response: { docs: [], metadata: { hits: 0 } } }
  const newsApiPayload = { totalResults: 0, articles: [] }

  it('guardian: newest by default, even when searching, relevance only when asked', async () => {
    const { lastUrl } = stubFetch(guardianPayload)
    const provider = createGuardianProvider('k')

    await provider.search({ ...base, query: 'ai' }, 1)
    expect(lastUrl().searchParams.get('order-by')).toBe('newest')

    await provider.search({ ...base, query: 'ai', sort: 'relevance' }, 1)
    expect(lastUrl().searchParams.get('order-by')).toBe('relevance')
  })

  it('nyt: same rule', async () => {
    const { lastUrl } = stubFetch(nytPayload)
    const provider = createNytProvider('k')

    await provider.search({ ...base, query: 'ai' }, 1)
    expect(lastUrl().searchParams.get('sort')).toBe('newest')

    await provider.search({ ...base, query: 'ai', sort: 'relevance' }, 1)
    expect(lastUrl().searchParams.get('sort')).toBe('relevance')
  })

  it('newsapi: sortBy follows the same rule on the everything endpoint', async () => {
    const { lastUrl } = stubFetch(newsApiPayload)
    const provider = createNewsApiProvider('k')

    await provider.search({ ...base, query: 'ai', from: '2025-01-01' }, 1)
    expect(lastUrl().searchParams.get('sortBy')).toBe('publishedAt')

    await provider.search({ ...base, query: 'ai', from: '2025-01-01', sort: 'relevance' }, 1)
    expect(lastUrl().searchParams.get('sortBy')).toBe('relevancy')
  })
})
