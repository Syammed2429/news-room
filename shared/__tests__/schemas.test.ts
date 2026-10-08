import { describe, expect, it } from 'vitest'
import {
  articleSchema,
  authorNameSchema,
  MAX_AUTHORS,
  MAX_QUERY_LENGTH,
  preferencesSchema,
  queryTextSchema,
  searchBodySchema,
} from '../schemas'

describe('queryTextSchema', () => {
  it('trims and enforces the length limit', () => {
    expect(queryTextSchema.parse('  climate  ')).toBe('climate')
    expect(queryTextSchema.safeParse('a'.repeat(MAX_QUERY_LENGTH + 1)).success).toBe(false)
  })
})

describe('authorNameSchema', () => {
  it('rejects blank and oversized names', () => {
    expect(authorNameSchema.safeParse('   ').success).toBe(false)
    expect(authorNameSchema.safeParse('x'.repeat(81)).success).toBe(false)
    expect(authorNameSchema.parse(' Jane Doe ')).toBe('Jane Doe')
  })
})

describe('preferencesSchema', () => {
  it('accepts a well-formed value', () => {
    const value = { providerIds: ['guardian'], categories: ['science'], authors: ['Jane Doe'] }
    expect(preferencesSchema.parse(value)).toEqual(value)
  })

  it.each([
    ['wrong types', { providerIds: 'guardian', categories: [], authors: [] }],
    ['unknown category', { providerIds: [], categories: ['gossip'], authors: [] }],
    ['too many authors', { providerIds: [], categories: [], authors: Array(MAX_AUTHORS + 1).fill('A') }],
    ['missing keys', {}],
    ['null', null],
  ])('rejects %s', (_name, value) => {
    expect(preferencesSchema.safeParse(value).success).toBe(false)
  })
})

describe('sort in a search', () => {
  const withSort = (sort: unknown) => ({
    request: { queries: [{ query: 'x', categories: [], authors: [], sort }], providerIds: [] },
    cursor: { page: 1, exhausted: [] },
  })

  it('accepts the two known orders and no sort at all', () => {
    expect(searchBodySchema.safeParse(withSort('newest')).success).toBe(true)
    expect(searchBodySchema.safeParse(withSort('relevance')).success).toBe(true)
    expect(searchBodySchema.safeParse(withSort(undefined)).success).toBe(true)
  })

  it('rejects anything else', () => {
    expect(searchBodySchema.safeParse(withSort('random')).success).toBe(false)
    expect(searchBodySchema.safeParse(withSort(1)).success).toBe(false)
  })
})

describe('searchBodySchema', () => {
  const body = {
    request: { queries: [{ query: '', categories: [], authors: [] }], providerIds: [] },
    cursor: { page: 1, exhausted: [] },
  }

  it('accepts a valid body and rejects extra keys', () => {
    expect(searchBodySchema.safeParse(body).success).toBe(true)
    expect(searchBodySchema.safeParse({ ...body, extra: 1 }).success).toBe(false)
  })
})

describe('articleSchema', () => {
  const article = {
    id: 'a:1',
    provider: 'a',
    title: 'Title',
    summary: 'Summary',
    url: 'https://example.com/1',
    publisher: 'Pub',
    publishedAt: '2025-01-01T00:00:00Z',
  }

  it('accepts a normal article, with and without the optional parts', () => {
    expect(articleSchema.safeParse(article).success).toBe(true)
    expect(
      articleSchema.safeParse({ ...article, imageUrl: 'https://cdn.example/a.jpg', section: 'Tech', author: 'Jane' }).success,
    ).toBe(true)
  })

  it.each([
    ['a script link', { url: 'javascript:alert(1)' }],
    ['a data link', { url: 'data:text/html,<b>x</b>' }],
    ['an insecure image', { imageUrl: 'http://cdn.example/a.jpg' }],
    ['an image that is a script', { imageUrl: 'javascript:alert(1)' }],
    ['a missing title', { title: undefined }],
    ['an enormous title', { title: 'x'.repeat(501) }],
    ['a number for a string', { publisher: 5 }],
  ])('rejects %s', (_name, change) => {
    expect(articleSchema.safeParse({ ...article, ...change }).success).toBe(false)
  })

  it('drops fields it does not know about', () => {
    const parsed = articleSchema.safeParse({ ...article, injected: '<script>' })
    expect(parsed.success && 'injected' in parsed.data).toBe(false)
  })
})
