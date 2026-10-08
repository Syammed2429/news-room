import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_RECENT, useRecentStore } from '../recent'

const KEY = 'news-recent-searches'
const store = () => useRecentStore.getState()
const stored = (searches: unknown) => localStorage.setItem(KEY, JSON.stringify({ state: { searches }, version: 1 }))

beforeEach(() => {
  localStorage.clear()
  useRecentStore.setState({ searches: [] })
})

describe('recent searches', () => {
  it('keeps the newest first', () => {
    store().add('climate')
    store().add('markets')
    expect(store().searches).toEqual(['markets', 'climate'])
  })

  it('moves a repeated search to the front instead of duplicating it, ignoring case', () => {
    store().add('Climate')
    store().add('markets')
    store().add('climate')
    expect(store().searches).toEqual(['climate', 'markets'])
  })

  it('ignores blank searches and trims the rest', () => {
    store().add('   ')
    store().add('  ai  ')
    expect(store().searches).toEqual(['ai'])
  })

  it('keeps only the latest few', () => {
    for (let i = 0; i < MAX_RECENT + 3; i++) store().add(`search ${i}`)
    expect(store().searches).toHaveLength(MAX_RECENT)
    expect(store().searches[0]).toBe(`search ${MAX_RECENT + 2}`)
  })

  it('can be cleared', () => {
    store().add('x1')
    store().clear()
    expect(store().searches).toEqual([])
  })
})

describe('reading recent searches back', () => {
  it('restores valid searches', async () => {
    stored(['a1', 'b2'])
    await useRecentStore.persist.rehydrate()
    expect(store().searches).toEqual(['a1', 'b2'])
  })

  it('drops bad entries, duplicates and anything over the limits', async () => {
    stored(['ok', 5, null, '', 'OK', 'x'.repeat(101), { evil: true }, 'fine'])
    await useRecentStore.persist.rehydrate()
    expect(store().searches).toEqual(['ok', 'fine'])
  })

  it('never loads more than the limit', async () => {
    stored(Array.from({ length: 50 }, (_, i) => `s${i}`))
    await useRecentStore.persist.rehydrate()
    expect(store().searches).toHaveLength(MAX_RECENT)
  })

  it.each([
    ['not json', '{oops'],
    ['not a list', JSON.stringify({ state: { searches: 'x' }, version: 1 })],
  ])('starts empty when storage holds %s', async (_name, raw) => {
    localStorage.setItem(KEY, raw)
    await useRecentStore.persist.rehydrate()
    expect(store().searches).toEqual([])
  })
})
