// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createTtlCache } from '../cache'

const setup = (overrides: Partial<Parameters<typeof createTtlCache>[0]> = {}) => {
  let time = 0
  const cache = createTtlCache<string>({
    ttlMs: 1000,
    errorTtlMs: 100,
    maxEntries: 3,
    now: () => time,
    ...overrides,
  })
  return { cache, advance: (ms: number) => (time += ms) }
}

describe('createTtlCache', () => {
  it('reuses a result until it expires', async () => {
    const { cache, advance } = setup()
    const load = vi.fn(async () => 'v')
    await cache.getOrLoad('k', load)
    await cache.getOrLoad('k', load)
    expect(load).toHaveBeenCalledTimes(1)

    advance(1001)
    await cache.getOrLoad('k', load)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('shares one in-flight request between simultaneous callers', async () => {
    const { cache } = setup()
    const load = vi.fn(async () => 'v')
    await Promise.all([cache.getOrLoad('k', load), cache.getOrLoad('k', load), cache.getOrLoad('k', load)])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('remembers failures briefly so a rate-limited API is not hammered', async () => {
    const { cache, advance } = setup()
    const load = vi.fn(async () => {
      throw new Error('429')
    })
    await expect(cache.getOrLoad('k', load)).rejects.toThrow('429')
    await expect(cache.getOrLoad('k', load)).rejects.toThrow('429')
    expect(load).toHaveBeenCalledTimes(1)

    advance(101)
    await expect(cache.getOrLoad('k', load)).rejects.toThrow('429')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('is bounded: the oldest entries are evicted first', async () => {
    const { cache } = setup()
    const load = vi.fn(async () => 'v')
    for (const key of ['a', 'b', 'c', 'd']) await cache.getOrLoad(key, load)
    expect(load).toHaveBeenCalledTimes(4)

    await cache.getOrLoad('d', load) // still cached
    expect(load).toHaveBeenCalledTimes(4)
    await cache.getOrLoad('a', load) // evicted
    expect(load).toHaveBeenCalledTimes(5)
  })
})
