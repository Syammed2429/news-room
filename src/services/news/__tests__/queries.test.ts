import { describe, expect, it } from 'vitest'
import { buildFeedRequest, buildLatestRequest, hasPreferences } from '../queries'

describe('buildLatestRequest', () => {
  it('maps filters to a single query', () => {
    const request = buildLatestRequest({
      query: 'ai',
      category: 'technology',
      providerIds: ['guardian'],
      sort: 'newest',
      from: '2025-01-01',
    })
    expect(request.providerIds).toEqual(['guardian'])
    expect(request.queries).toEqual([
      { query: 'ai', categories: ['technology'], authors: [], sort: 'newest', from: '2025-01-01', to: undefined },
    ])
  })

  it('uses no category when none is selected', () => {
    const request = buildLatestRequest({ query: '', category: null, providerIds: [], sort: 'newest' })
    expect(request.queries[0]?.categories).toEqual([])
  })
})

describe('buildFeedRequest', () => {
  const search = { query: 'x', category: null, providerIds: [], sort: 'newest' as const, from: undefined, to: undefined }

  it('uses one query when there are no preferred authors', () => {
    const request = buildFeedRequest({ providerIds: ['nyt'], categories: ['science'], authors: [] }, search)
    expect(request.queries).toHaveLength(1)
    expect(request.providerIds).toEqual(['nyt'])
  })

  it('adds a separate author query next to the category query', () => {
    const request = buildFeedRequest(
      { providerIds: [], categories: ['science'], authors: ['Jane Doe'] },
      search,
    )
    expect(request.queries).toHaveLength(2)
    expect(request.queries[0]).toMatchObject({ categories: ['science'], authors: [] })
    expect(request.queries[1]).toMatchObject({ categories: [], authors: ['Jane Doe'] })
  })
})

describe('buildFeedRequest with partial preferences', () => {
  const search = { query: '', category: null, providerIds: [], sort: 'newest' as const, from: undefined, to: undefined }

  it('asks only for the chosen authors when nothing else is picked', () => {
    const request = buildFeedRequest({ providerIds: [], categories: [], authors: ['Jane Doe'] }, search)
    expect(request.queries).toEqual([expect.objectContaining({ categories: [], authors: ['Jane Doe'] })])
  })

  it('still returns the latest from preferred sources when only sources are chosen', () => {
    const request = buildFeedRequest({ providerIds: ['nyt'], categories: [], authors: [] }, search)
    expect(request.queries).toHaveLength(1)
    expect(request.queries[0]).toMatchObject({ categories: [], authors: [] })
  })
})

describe('buildFeedRequest with filters picked on the feed', () => {
  const base = { query: '', sort: 'newest' as const, from: undefined, to: undefined }
  const prefs = { providerIds: ['guardian', 'nyt'], categories: ['science' as const, 'health' as const], authors: [] }

  it('narrows the preferred categories to the one picked', () => {
    const request = buildFeedRequest(prefs, { ...base, category: 'health', providerIds: [] })
    expect(request.queries[0]).toMatchObject({ categories: ['health'] })
  })

  it('ignores a category the preferences do not include', () => {
    const request = buildFeedRequest(prefs, { ...base, category: 'sports', providerIds: [] })
    expect(request.queries[0]).toMatchObject({ categories: ['science', 'health'] })
  })

  it('narrows the preferred sources, and ignores ones that are not preferred', () => {
    expect(buildFeedRequest(prefs, { ...base, category: null, providerIds: ['nyt'] }).providerIds).toEqual(['nyt'])
    expect(buildFeedRequest(prefs, { ...base, category: null, providerIds: ['newsapi'] }).providerIds).toEqual([
      'guardian',
      'nyt',
    ])
  })

  it('uses any picked source when no sources are preferred', () => {
    const request = buildFeedRequest({ ...prefs, providerIds: [] }, { ...base, category: null, providerIds: ['nyt'] })
    expect(request.providerIds).toEqual(['nyt'])
  })

  it('applies the category to the author query too', () => {
    const request = buildFeedRequest(
      { providerIds: [], categories: [], authors: ['Jane Doe'] },
      { ...base, category: 'science', providerIds: [] },
    )
    expect(request.queries).toEqual([expect.objectContaining({ categories: ['science'], authors: ['Jane Doe'] })])
  })
})

describe('hasPreferences', () => {
  it('is false only when everything is empty', () => {
    expect(hasPreferences({ providerIds: [], categories: [], authors: [] })).toBe(false)
    expect(hasPreferences({ providerIds: [], categories: [], authors: ['A'] })).toBe(true)
  })
})

describe('sort in a request', () => {
  const filters = { query: 'ai', category: null, providerIds: [], from: undefined, to: undefined }

  it('passes the reader\'s choice along while searching', () => {
    const request = buildLatestRequest({ ...filters, sort: 'relevance' })
    expect(request.queries[0]?.sort).toBe('relevance')
  })

  it('ignores it when there is no search, since there is nothing to rank', () => {
    const request = buildLatestRequest({ ...filters, query: '', sort: 'relevance' })
    expect(request.queries[0]?.sort).toBe('newest')
  })

  it('applies to every query in the feed', () => {
    const request = buildFeedRequest(
      { providerIds: [], categories: ['science'], authors: ['Jane Doe'] },
      { query: 'ai', category: null, providerIds: [], sort: 'relevance', from: undefined, to: undefined },
    )
    expect(request.queries.map((q) => q.sort)).toEqual(['relevance', 'relevance'])
  })
})
