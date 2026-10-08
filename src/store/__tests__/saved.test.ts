import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_SAVED } from '@shared/schemas'
import type { Article } from '@shared/news'
import { useSavedStore } from '../saved'

const KEY = 'news-saved'

const article = (n: number, overrides: Partial<Article> = {}): Article => ({
  id: `a:${n}`,
  provider: 'a',
  title: `Article ${n}`,
  summary: 'Summary',
  url: `https://example.com/${n}`,
  publisher: 'Pub',
  publishedAt: '2025-01-01T00:00:00Z',
  ...overrides,
})

const store = () => useSavedStore.getState()
const stored = (articles: unknown[]) => localStorage.setItem(KEY, JSON.stringify({ state: { articles }, version: 1 }))

beforeEach(() => {
  localStorage.clear()
  useSavedStore.setState({ articles: [] })
})

describe('saved articles', () => {
  it('saves an article, newest first, and removes it when toggled again', () => {
    store().toggle(article(1))
    store().toggle(article(2))
    expect(store().articles.map((a) => a.id)).toEqual(['a:2', 'a:1'])

    store().toggle(article(2))
    expect(store().articles.map((a) => a.id)).toEqual(['a:1'])
  })

  it('keeps the latest 50 and pushes the oldest out', () => {
    for (let i = 0; i < MAX_SAVED + 5; i++) store().toggle(article(i))
    expect(store().articles).toHaveLength(MAX_SAVED)
    expect(store().articles[0]?.id).toBe(`a:${MAX_SAVED + 4}`)
    expect(store().articles.some((a) => a.id === 'a:0')).toBe(false)
  })

  it('writes to localStorage', () => {
    store().toggle(article(1))
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { state: { articles: Article[] } }
    expect(saved.state.articles).toHaveLength(1)
  })
})

describe('reading saved articles back', () => {
  it('restores good articles', async () => {
    stored([article(1), article(2)])
    await useSavedStore.persist.rehydrate()
    expect(store().articles).toHaveLength(2)
  })

  it('drops only the bad entries and keeps the rest', async () => {
    stored([article(1), article(2, { url: 'javascript:alert(1)' }), article(3, { imageUrl: 'http://insecure.example/a.jpg' }), { nonsense: true }, 'text'])
    await useSavedStore.persist.rehydrate()
    expect(store().articles.map((a) => a.id)).toEqual(['a:1'])
  })

  it.each([
    ['not json', '{oops'],
    ['no articles key', JSON.stringify({ state: {}, version: 1 })],
    ['articles is not a list', JSON.stringify({ state: { articles: 'x' }, version: 1 })],
  ])('starts empty when storage holds %s', async (_name, raw) => {
    localStorage.setItem(KEY, raw)
    await useSavedStore.persist.rehydrate()
    expect(store().articles).toEqual([])
  })

  it('never loads more than the limit, even if storage was edited', async () => {
    stored(Array.from({ length: 200 }, (_, i) => article(i)))
    await useSavedStore.persist.rehydrate()
    expect(store().articles).toHaveLength(MAX_SAVED)
  })
})
