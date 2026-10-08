// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createMockProvider } from '../providers/mock'

const base = { query: '', categories: [], authors: [] }

describe('demo provider', () => {
  const provider = createMockProvider('demo', 'Demo', 0)

  it('returns articles newest first by default', async () => {
    const { articles } = await provider.search(base, 1)
    const times = articles.map((a) => Date.parse(a.publishedAt))
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('pages through the catalogue and says when there is more', async () => {
    const first = await provider.search(base, 1)
    expect(first.articles).toHaveLength(10)
    expect(first.hasMore).toBe(true)

    const last = await provider.search(base, 6)
    expect(last.hasMore).toBe(false)
  })

  it('ranks the best matches first when asked for relevance', async () => {
    const query = 'markets'
    const { articles } = await provider.search({ ...base, query, sort: 'relevance' }, 1)
    expect(articles.length).toBeGreaterThan(0)
    const hits = (text: string) => text.toLowerCase().split(query).length - 1
    const scores = articles.map((a) => hits(a.title) * 2 + hits(a.summary))
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('only returns what matches the filters', async () => {
    const { articles } = await provider.search({ ...base, categories: ['sports'] }, 1)
    expect(articles.every((a) => a.section === 'Sports')).toBe(true)
  })
})
