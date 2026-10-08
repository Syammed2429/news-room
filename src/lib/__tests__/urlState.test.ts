import { describe, expect, it } from 'vitest'
import { DEFAULT_URL_STATE, parseUrlState, toSearch } from '../urlState'

describe('parseUrlState', () => {
  it('reads every supported piece', () => {
    expect(
      parseUrlState('?q=climate&category=science&sources=guardian,nyt&sort=relevance&from=2025-01-05&to=2025-01-20&view=feed'),
    ).toEqual({
      query: 'climate',
      category: 'science',
      providerIds: ['guardian', 'nyt'],
      sort: 'relevance',
      from: '2025-01-05',
      to: '2025-01-20',
      view: 'feed',
    })
  })

  it('returns nothing for a plain address', () => {
    expect(parseUrlState('')).toEqual({})
  })

  it('drops values that fail the same checks the API uses, keeping the rest', () => {
    expect(
      parseUrlState('?category=gossip&view=admin&sort=random&from=2025-13-40&to=yesterday&q=ok'),
    ).toEqual({ query: 'ok' })
  })

  it('ignores a search that is too long', () => {
    expect(parseUrlState(`?q=${'a'.repeat(101)}`)).toEqual({})
  })

  it('keeps hostile text as plain text, since it is only ever rendered as text', () => {
    const state = parseUrlState('?q=' + encodeURIComponent('<script>alert(1)</script>'))
    expect(state.query).toBe('<script>alert(1)</script>')
  })

  it('removes duplicate and empty sources and caps how many there can be', () => {
    expect(parseUrlState('?sources=a,,b,a')).toEqual({ providerIds: ['a', 'b'] })
    const many = Array.from({ length: 30 }, (_, i) => `s${i}`).join(',')
    expect(parseUrlState(`?sources=${many}`).providerIds).toHaveLength(10)
  })

  it('ignores an end date that comes before the start date', () => {
    expect(parseUrlState('?from=2025-02-01&to=2025-01-01')).toEqual({ from: '2025-02-01' })
  })

  it('accepts an end date on its own', () => {
    expect(parseUrlState('?to=2025-01-01')).toEqual({ to: '2025-01-01' })
  })
})

describe('toSearch', () => {
  it('keeps the plain page clean', () => {
    expect(toSearch(DEFAULT_URL_STATE)).toBe('')
  })

  it('writes only what differs from the defaults', () => {
    expect(toSearch({ ...DEFAULT_URL_STATE, category: 'sports' })).toBe('?category=sports')
    expect(toSearch({ ...DEFAULT_URL_STATE, view: 'feed' })).toBe('?view=feed')
  })

  it('only writes the sort while there is a search', () => {
    expect(toSearch({ ...DEFAULT_URL_STATE, sort: 'relevance' })).toBe('')
    expect(toSearch({ ...DEFAULT_URL_STATE, query: 'ai', sort: 'relevance' })).toBe('?q=ai&sort=relevance')
  })

  it('encodes special characters', () => {
    expect(toSearch({ ...DEFAULT_URL_STATE, query: 'a&b=c d' })).toBe('?q=a%26b%3Dc+d')
  })

  it('round-trips through parse', () => {
    const state = {
      view: 'feed' as const,
      query: 'café & crème',
      category: 'health' as const,
      providerIds: ['guardian', 'nyt'],
      sort: 'relevance' as const,
      from: '2025-01-01',
      to: '2025-02-01',
    }
    expect(parseUrlState(toSearch(state))).toEqual(state)
  })
})
