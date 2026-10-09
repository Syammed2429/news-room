import { describe, expect, it } from 'vitest'
import type { Article } from '@shared/news'
import { matchesSavedFilters, withinCategories, withinSources } from '../filters'

const article = (overrides: Partial<Article> = {}): Article => ({
  id: 'a',
  provider: 'guardian',
  title: 'Telescope captures earliest galaxy',
  summary: 'Researchers say the image is the oldest yet.',
  url: 'https://example.com/a',
  publisher: 'The Guardian',
  author: 'Maya Chen',
  publishedAt: '2026-10-05T23:30:00.000Z',
  ...overrides,
})

const none = { query: '', providerIds: [], from: undefined, to: undefined }

describe('withinSources', () => {
  it('keeps only chosen sources the preferences allow', () => {
    expect(withinSources(['nyt', 'newsapi'], ['nyt', 'guardian'])).toEqual(['nyt'])
  })
  it('allows anything when no sources are preferred', () => {
    expect(withinSources(['nyt'], [])).toEqual(['nyt'])
  })
})

describe('withinCategories', () => {
  it('drops a category the preferences do not include', () => {
    expect(withinCategories('sports', ['science'])).toBeNull()
    expect(withinCategories('science', ['science'])).toBe('science')
  })
  it('allows any category when none are preferred', () => {
    expect(withinCategories('sports', [])).toBe('sports')
  })
})

describe('matchesSavedFilters', () => {
  it('matches everything when no filter is set', () => {
    expect(matchesSavedFilters(article(), none)).toBe(true)
  })
  it('searches title, summary, author and publisher without caring about case', () => {
    for (const query of ['GALAXY', 'oldest', 'maya', 'guardian']) {
      expect(matchesSavedFilters(article(), { ...none, query })).toBe(true)
    }
    expect(matchesSavedFilters(article(), { ...none, query: 'football' })).toBe(false)
  })
  it('filters by source', () => {
    expect(matchesSavedFilters(article(), { ...none, providerIds: ['nyt'] })).toBe(false)
    expect(matchesSavedFilters(article(), { ...none, providerIds: ['nyt', 'guardian'] })).toBe(true)
  })
  it('includes both ends of the date range', () => {
    expect(matchesSavedFilters(article(), { ...none, from: '2026-10-05', to: '2026-10-05' })).toBe(true)
    expect(matchesSavedFilters(article(), { ...none, from: '2026-10-06' })).toBe(false)
    expect(matchesSavedFilters(article(), { ...none, to: '2026-10-04' })).toBe(false)
  })
})
