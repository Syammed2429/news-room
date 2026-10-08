import { describe, expect, it } from 'vitest'
import {
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
