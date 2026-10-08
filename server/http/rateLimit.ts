import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context, MiddlewareHandler } from 'hono'

interface Options {
  windowMs: number
  max: number
  trustProxy: boolean
  now?: () => number
}

interface Window {
  count: number
  resetAt: number
}

const MAX_TRACKED_CLIENTS = 10_000

// who is calling. X-Forwarded-For can be faked, so it's only read when TRUST_PROXY is on
export const clientKey = (c: Context, trustProxy: boolean): string => {
  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return forwarded
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

// Fixed window counter kept in memory. It stops people using the API as a free proxy for
// our upstream quotas. With more than one instance it needs a shared store.
export const rateLimit = ({ windowMs, max, trustProxy, now = Date.now }: Options): MiddlewareHandler => {
  const windows = new Map<string, Window>()

  const sweep = (time: number) => {
    if (windows.size < MAX_TRACKED_CLIENTS) return
    for (const [key, window] of windows) if (window.resetAt <= time) windows.delete(key)
  }

  return async (c, next) => {
    const time = now()
    sweep(time)

    const key = clientKey(c, trustProxy)
    const current = windows.get(key)
    const window = current && current.resetAt > time ? current : { count: 0, resetAt: time + windowMs }
    window.count += 1
    windows.set(key, window)

    c.header('RateLimit-Limit', String(max))
    c.header('RateLimit-Remaining', String(Math.max(0, max - window.count)))

    if (window.count > max) {
      const retryAfter = Math.ceil((window.resetAt - time) / 1000)
      c.header('Retry-After', String(retryAfter))
      return c.json({ error: 'Too many requests, please slow down' }, 429)
    }
    await next()
    return undefined
  }
}
