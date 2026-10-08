import { describe, expect, it } from 'vitest'
import { buildFeedRequest, buildLatestRequest, hasPreferences } from '../queries'

describe('buildLatestRequest', () => {
  it('maps filters to a single query', () => {
    const request = buildLatestRequest({
      query: 'ai',
      category: 'technology',
      providerIds: ['guardian'],
      from: '2025-01-01',
    })
    expect(request.providerIds).toEqual(['guardian'])
    expect(request.queries).toEqual([
      { query: 'ai', categories: ['technology'], authors: [], from: '2025-01-01', to: undefined },
    ])
  })

  it('uses no category when none is selected', () => {
    const request = buildLatestRequest({ query: '', category: null, providerIds: [] })
    expect(request.queries[0]?.categories).toEqual([])
  })
})

describe('buildFeedRequest', () => {
  const search = { query: 'x', from: undefined, to: undefined }

  it('uses one query when there are no preferred authors', () => {
    const request = buildFeedRequest({ providerIds: ['nyt'], categories: ['science'], authors: [] }, search)
    expect(request.queries).toHaveLength(1)
    expect(request.providerIds).toEqual(['nyt'])
  })

  it('adds a separate author query so the feed is a union, not an intersection', () => {
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
  const search = { query: '', from: undefined, to: undefined }

  it('does not run an unfiltered category query when only authors are chosen', () => {
    const request = buildFeedRequest({ providerIds: [], categories: [], authors: ['Jane Doe'] }, search)
    expect(request.queries).toEqual([expect.objectContaining({ categories: [], authors: ['Jane Doe'] })])
  })

  it('still returns the latest from preferred sources when only sources are chosen', () => {
    const request = buildFeedRequest({ providerIds: ['nyt'], categories: [], authors: [] }, search)
    expect(request.queries).toHaveLength(1)
    expect(request.queries[0]).toMatchObject({ categories: [], authors: [] })
  })
})

describe('hasPreferences', () => {
  it('is false only when everything is empty', () => {
    expect(hasPreferences({ providerIds: [], categories: [], authors: [] })).toBe(false)
    expect(hasPreferences({ providerIds: [], categories: [], authors: ['A'] })).toBe(true)
  })
})
