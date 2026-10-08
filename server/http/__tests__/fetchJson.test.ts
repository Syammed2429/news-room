// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildUrl, fetchJson, UpstreamError } from '../fetchJson'

const stub = (behaviour: () => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>(async () => behaviour())
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('fetchJson', () => {
  it('returns the parsed body', async () => {
    stub(async () => Response.json({ ok: true }))
    await expect(fetchJson('https://api.example/x')).resolves.toEqual({ ok: true })
  })

  it('refuses redirects, so a key in the URL cannot be sent somewhere else', async () => {
    const fetchMock = stub(async () => Response.json({}))
    await fetchJson('https://api.example/x')
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' })
  })

  it.each([
    [401, 'The API key was rejected'],
    [403, 'The API key was rejected'],
    [429, 'Rate limit reached, try again shortly'],
    [426, 'Free plan result limit reached'],
    [500, 'Source responded with an error (500)'],
  ])('describes a %i in words written for readers', async (status, message) => {
    stub(async () => new Response('{}', { status }))
    const error = await fetchJson('https://api.example/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(UpstreamError)
    expect((error as UpstreamError).message).toBe(message)
    expect((error as UpstreamError).status).toBe(status)
  })

  it('reports an unreachable source without naming it', async () => {
    stub(async () => {
      throw new TypeError('connect ECONNREFUSED api.example:443')
    })
    const error = (await fetchJson('https://api.example/x?api-key=SECRET').catch((e: unknown) => e)) as UpstreamError
    expect(error.status).toBe(502)
    expect(error.message).toBe('Source could not be reached')
    expect(error.message).not.toContain('SECRET')
    expect(error.message).not.toContain('api.example')
  })

  it('reports a body that is not JSON', async () => {
    stub(async () => new Response('<html>oops</html>'))
    const error = (await fetchJson('https://api.example/x').catch((e: unknown) => e)) as UpstreamError
    expect(error.status).toBe(502)
    expect(error.message).toMatch(/unreadable/)
  })

  it('passes a cancellation through untouched, since nobody is waiting for the answer', async () => {
    const controller = new AbortController()
    controller.abort()
    stub(async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    await expect(fetchJson('https://api.example/x', { signal: controller.signal })).rejects.toThrow('aborted')
  })

  it('gives up on a source that never answers', async () => {
    const fetchMock = stub(async () => Response.json({}))
    await fetchJson('https://api.example/x')
    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.signal).toBeInstanceOf(AbortSignal) // a timeout is always attached
  })
})

describe('buildUrl', () => {
  it('encodes values and skips empty ones', () => {
    const url = new URL(buildUrl('https://api.example/search', { q: 'a&b c', page: 2, empty: '', missing: undefined }))
    expect(url.searchParams.get('q')).toBe('a&b c')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.has('empty')).toBe(false)
    expect(url.searchParams.has('missing')).toBe(false)
    expect(url.search).toContain('a%26b+c')
  })
})
