// @vitest-environment node
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { rateLimit } from '../rateLimit'

const build = (options: { max?: number; trustProxy?: boolean; now?: () => number } = {}) => {
  const app = new Hono()
  app.use('*', rateLimit({ windowMs: 60_000, max: options.max ?? 2, trustProxy: options.trustProxy ?? false, ...(options.now && { now: options.now }) }))
  app.get('/', (c) => c.text('ok'))
  return app
}

const hit = (app: Hono, headers: Record<string, string> = {}) => app.request('/', { headers })

describe('rateLimit', () => {
  it('lets requests through until the budget is spent, then answers 429 with Retry-After', async () => {
    const app = build({ max: 2 })
    expect((await hit(app)).status).toBe(200)
    expect((await hit(app)).status).toBe(200)

    const limited = await hit(app)
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(await limited.json()).toEqual({ error: 'Too many requests, please slow down' })
  })

  it('reports what is left in headers', async () => {
    const response = await hit(build({ max: 5 }))
    expect(response.headers.get('ratelimit-limit')).toBe('5')
    expect(response.headers.get('ratelimit-remaining')).toBe('4')
  })

  it('starts a fresh budget when the window is over', async () => {
    let time = 0
    const app = build({ max: 1, now: () => time })
    expect((await hit(app)).status).toBe(200)
    expect((await hit(app)).status).toBe(429)

    time = 60_001
    expect((await hit(app)).status).toBe(200)
  })

  describe('who counts as the same caller', () => {
    it('ignores X-Forwarded-For by default, because anyone can set it to dodge the limit', async () => {
      const app = build({ max: 1, trustProxy: false })
      expect((await hit(app, { 'x-forwarded-for': '1.1.1.1' })).status).toBe(200)
      // a different claimed address does not buy a fresh budget
      expect((await hit(app, { 'x-forwarded-for': '2.2.2.2' })).status).toBe(429)
    })

    it('uses the first forwarded address when told it sits behind a proxy', async () => {
      const app = build({ max: 1, trustProxy: true })
      expect((await hit(app, { 'x-forwarded-for': '1.1.1.1, 10.0.0.1' })).status).toBe(200)
      expect((await hit(app, { 'x-forwarded-for': '1.1.1.1, 10.0.0.9' })).status).toBe(429) // same client
      expect((await hit(app, { 'x-forwarded-for': '2.2.2.2' })).status).toBe(200) // a different one
    })
  })
})
