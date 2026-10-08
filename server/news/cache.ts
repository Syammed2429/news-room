interface Entry<V> {
  expiresAt: number
  value: Promise<V>
}

interface Options {
  // how long a good result is reused
  ttlMs: number
  // how long a failure is remembered, so we stop hitting an API that is rate limiting us
  errorTtlMs: number
  // oldest entries are dropped once this is exceeded
  maxEntries: number
  now?: () => number
}

export interface TtlCache<V> {
  // returns the cached value, or runs load() once even if several callers ask at the same time
  getOrLoad: (key: string, load: () => Promise<V>) => Promise<V>
}

export const createTtlCache = <V>({
  ttlMs,
  errorTtlMs,
  maxEntries,
  now = Date.now,
}: Options): TtlCache<V> => {
  const entries = new Map<string, Entry<V>>()

  const evictOverflow = () => {
    while (entries.size > maxEntries) {
      const oldest = entries.keys().next()
      if (oldest.done) return
      entries.delete(oldest.value)
    }
  }

  return {
    getOrLoad: (key, load) => {
      const existing = entries.get(key)
      if (existing && existing.expiresAt > now()) return existing.value

      // callers asking at the same time share this promise
      const value = load()
      const entry: Entry<V> = { expiresAt: now() + ttlMs, value }
      entries.delete(key)
      entries.set(key, entry)
      evictOverflow()

      value.catch(() => {
        // keep failures only briefly, and only if the entry wasn't replaced meanwhile
        if (entries.get(key) === entry) entry.expiresAt = now() + errorTtlMs
      })
      return value
    },
  }
}
