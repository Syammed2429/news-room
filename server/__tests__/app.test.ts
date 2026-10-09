// @vitest-environment node
import type { SourcesResponse } from '@shared/api'
import type { AggregatedPage } from '@shared/pagination'
import { FIRST_PAGE } from '@shared/pagination'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app'
import { createNewsAggregator } from '../news/aggregator'
import { cacheProviders, createDemoProviders, createProviders } from '../news/providers'

const SECRET = 'SUPER-SECRET-KEY-123'

const build = (overrides: { max?: number; demo?: boolean } = {}) =>
  createApp({
    aggregator: createNewsAggregator(createDemoProviders()),
    demo: overrides.demo ?? true,
    trustProxy: false,
    rateLimit: { windowMs: 60_000, max: overrides.max ?? 1000 },
  })

const search = (app: ReturnType<typeof build>, body: unknown, init: RequestInit = {}) =>
  app.request('/api/news/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...init,
  })

const valid = {
  request: { queries: [{ query: '', categories: [], authors: [] }], providerIds: [] },
  cursor: FIRST_PAGE,
}

afterEach(() => vi.unstubAllGlobals())

describe('POST /api/news/search', () => {
  it('returns normalized articles for a valid request', async () => {
    const response = await search(build(), valid)
    expect(response.status).toBe(200)
    const page = (await response.json()) as AggregatedPage
    expect(page.articles.length).toBeGreaterThan(0)
    expect(page.articles[0]).toHaveProperty('title')
  })

  it.each([
    ['unknown top-level key', { ...valid, admin: true }],
    ['unknown query key', { ...valid, request: { ...valid.request, queries: [{ query: '', categories: [], authors: [], $where: '1' }] } }],
    ['bad category', { ...valid, request: { ...valid.request, queries: [{ query: '', categories: ['hacking'], authors: [] }] } }],
    ['over-long query', { ...valid, request: { ...valid.request, queries: [{ query: 'a'.repeat(101), categories: [], authors: [] }] } }],
    ['too many queries', { ...valid, request: { ...valid.request, queries: Array(3).fill({ query: '', categories: [], authors: [] }) } }],
    ['too many authors', { ...valid, request: { ...valid.request, queries: [{ query: '', categories: [], authors: Array(11).fill('a') }] } }],
    ['non-date', { ...valid, request: { ...valid.request, queries: [{ query: '', categories: [], authors: [], from: '2025-13-99' }] } }],
    ['page beyond the cap', { ...valid, cursor: { page: 11, exhausted: [] } }],
    ['negative page', { ...valid, cursor: { page: -1, exhausted: [] } }],
    ['fractional page', { ...valid, cursor: { page: 1.5, exhausted: [] } }],
    ['wrong types', { request: 'x', cursor: 5 }],
    ['empty object', {}],
  ])('rejects %s with a generic 400', async (_name, body) => {
    const response = await search(build(), body)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request' })
  })

  it('rejects malformed JSON', async () => {
    const response = await search(build(), '{not json')
    expect(response.status).toBe(400)
  })

  it('rejects oversized bodies', async () => {
    const response = await search(build(), JSON.stringify({ ...valid, padding: 'x'.repeat(20_000) }))
    expect(response.status).toBe(413)
  })

  it('treats injection-looking text as inert data', async () => {
    const payload = {
      ...valid,
      request: {
        queries: [{ query: `'; DROP TABLE users;-- <script>alert(1)</script> {"$ne":1}`, categories: [], authors: [] }],
        providerIds: ['../../etc/passwd'],
      },
    }
    const response = await search(build(), payload)
    expect(response.status).toBe(200)
    const page = (await response.json()) as AggregatedPage
    expect(page.articles).toEqual([])
  })

  it('has no GET variant and no CORS grant to other origins', async () => {
    const app = build()
    expect((await app.request('/api/news/search')).status).toBe(404)
    const response = await search(app, valid, { headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' } })
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('cross-site requests', () => {
  const withSite = (site: string) =>
    search(build(), valid, { headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': site } })

  it('turns away calls that another website makes from a visitor\'s browser', async () => {
    expect((await withSite('cross-site')).status).toBe(403)
    expect((await withSite('same-site')).status).toBe(403)
  })

  it('allows the app\'s own requests', async () => {
    expect((await withSite('same-origin')).status).toBe(200)
    expect((await withSite('none')).status).toBe(200)
  })
})

describe('rate limiting', () => {
  it('returns 429 with Retry-After once the budget is spent', async () => {
    const app = build({ max: 3 })
    const statuses: number[] = []
    for (let i = 0; i < 5; i++) statuses.push((await search(app, valid)).status)
    expect(statuses).toEqual([200, 200, 200, 429, 429])

    const limited = await search(app, valid)
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
  })
})

describe('security headers', () => {
  it('sets a strict CSP and hardening headers on every response', async () => {
    const response = await build().request('/healthz')
    const csp = response.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("manifest-src 'self'")
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-powered-by')).toBeNull()
  })

  it('answers unknown API routes with JSON, not the SPA shell', async () => {
    const response = await build().request('/api/nope')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'Not found' })
  })
})

describe('secret handling', () => {
  const liveApp = (upstream: Response) => {
    vi.stubGlobal('fetch', vi.fn(async () => upstream))
    const providers = cacheProviders(createProviders({ guardian: SECRET }), {
      ttlMs: 1000,
      errorTtlMs: 1000,
      maxEntries: 10,
    })
    return createApp({
      aggregator: createNewsAggregator(providers),
      demo: false,
      trustProxy: false,
      rateLimit: { windowMs: 60_000, max: 1000 },
    })
  }

  it('never exposes the key in the sources response', async () => {
    const response = await liveApp(new Response('{}')).request('/api/news/sources')
    const text = await response.text()
    expect(text).not.toContain(SECRET)
    expect((JSON.parse(text) as SourcesResponse).sources).toEqual([{ id: 'guardian', name: 'The Guardian' }])
  })

  it('never exposes the key when the upstream fails, even if it echoes it back', async () => {
    const app = liveApp(new Response(`bad key ${SECRET}`, { status: 401 }))
    const response = await search(app as ReturnType<typeof build>, valid)
    const text = await response.text()
    expect(response.status).toBe(200)
    expect(text).not.toContain(SECRET)
    expect(JSON.parse(text)).toMatchObject({ failures: [{ provider: 'guardian', message: 'The API key was rejected' }] })
  })

  it('turns unexpected crashes into a generic 500', async () => {
    const boom = createApp({
      aggregator: {
        providers: [],
        search: async () => {
          throw new Error(`db password is ${SECRET}`)
        },
      },
      demo: false,
      trustProxy: false,
      rateLimit: { windowMs: 60_000, max: 1000 },
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await search(boom as ReturnType<typeof build>, valid)
    expect(response.status).toBe(500)
    const text = await response.text()
    expect(text).not.toContain(SECRET)
    expect(JSON.parse(text)).toEqual({ error: 'Internal server error' })
  })
})

describe('content type', () => {
  it.each([
    ['text/plain', 415],
    ['application/x-www-form-urlencoded', 415],
    ['application/json', 200],
    ['application/json; charset=utf-8', 200],
  ])('%s -> %i', async (contentType, status) => {
    const response = await build().request('/api/news/search', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body: JSON.stringify(valid),
    })
    expect(response.status).toBe(status)
  })

  it('refuses a POST with no content type at all', async () => {
    const response = await build().request('/api/news/search', { method: 'POST', body: JSON.stringify(valid) })
    expect(response.status).toBe(415)
  })
})

describe('compression', () => {
  it('gzips API responses when the client accepts it, and the body is still valid JSON', async () => {
    const response = await search(build(), valid, {
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'gzip' },
    })
    expect(response.headers.get('content-encoding')).toBe('gzip')
    const raw = Buffer.from(await response.arrayBuffer())
    expect(JSON.parse(gunzipSync(raw).toString())).toHaveProperty('articles')
  })

  it('sends plain responses to clients that do not ask for compression', async () => {
    const response = await search(build(), valid)
    expect(response.headers.get('content-encoding')).toBeNull()
  })
})

describe('serving the built app', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'newsroom-dist-'))
  mkdirSync(path.join(dir, 'assets'))
  const filler = 'x'.repeat(4000)
  writeFileSync(path.join(dir, 'index.html'), `<!doctype html><title>Newsroom</title><div id="root"></div><!--${filler}-->`)
  writeFileSync(path.join(dir, 'assets', 'app-abc123.js'), `console.log("${filler}")`)

  const withStatic = () =>
    createApp({
      aggregator: createNewsAggregator(createDemoProviders()),
      demo: true,
      trustProxy: false,
      rateLimit: { windowMs: 60_000, max: 1000 },
      // serveStatic resolves this against the working directory
      staticDir: path.relative(process.cwd(), dir),
    })

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('serves the page, never caches it, and compresses it', async () => {
    const response = await withStatic().request('/', { headers: { 'Accept-Encoding': 'gzip' } })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-cache')
    expect(response.headers.get('content-encoding')).toBe('gzip')
  })

  it('caches fingerprinted assets for a year', async () => {
    const response = await withStatic().request('/assets/app-abc123.js')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
  })

  it('gives unknown paths the app, but unknown API paths a JSON 404', async () => {
    const app = withStatic()
    const page = await app.request('/some/client/route')
    expect(page.status).toBe(200)
    expect(await page.text()).toContain('id="root"')

    const api = await app.request('/api/nope')
    expect(api.status).toBe(404)
    expect(await api.json()).toEqual({ error: 'Not found' })
  })

  it('404s a missing asset instead of caching the app page as that file', async () => {
    const response = await withStatic().request('/assets/old-hash.js')
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control') ?? '').not.toContain('immutable')
  })

  it('404s the Vercel analytics script instead of answering with the app page', async () => {
    const response = await withStatic().request('/_vercel/insights/script.js')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).not.toContain('text/html')
  })

  it('does not expose files outside the build folder', async () => {
    const response = await withStatic().request('/..%2fpackage.json')
    expect(await response.text()).not.toContain('"name": "news-aggregator"')
  })
})
