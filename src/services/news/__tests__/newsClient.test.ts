import { afterEach, describe, expect, it, vi } from 'vitest'
import { FIRST_PAGE } from '@shared/pagination'
import { newsClient } from '../newsClient'

const request = { queries: [{ query: 'ai', categories: [], authors: [] }], providerIds: [] }

const stubFetch = (response: Response | Error) => {
  const fetchMock = vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => vi.unstubAllGlobals())

describe('newsClient.search', () => {
  it('posts the request and the cursor as JSON to our own API', async () => {
    const fetchMock = stubFetch(Response.json({ articles: [], failures: [] }))

    const page = await newsClient.search(request, FIRST_PAGE)

    expect(page).toEqual({ articles: [], failures: [] })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/news/search')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(String(init.body))).toEqual({ request, cursor: FIRST_PAGE })
  })

  it.each([
    [429, /too many requests/i],
    [500, /having trouble/i],
    [503, /having trouble/i],
    [400, /not accepted/i],
  ])('turns a %i into a message written for the reader', async (status, message) => {
    stubFetch(new Response('{}', { status }))
    await expect(newsClient.search(request, FIRST_PAGE)).rejects.toThrow(message)
  })

  it('says the reader looks offline when the network call itself fails', async () => {
    stubFetch(new TypeError('Failed to fetch'))
    await expect(newsClient.search(request, FIRST_PAGE)).rejects.toThrow(/offline/i)
  })

  it('passes a cancellation straight through instead of calling it an offline error', async () => {
    const controller = new AbortController()
    controller.abort()
    stubFetch(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    await expect(newsClient.search(request, FIRST_PAGE, controller.signal)).rejects.toThrow('aborted')
  })

  it('never exposes server error details in the message', async () => {
    stubFetch(new Response(JSON.stringify({ error: 'db password is hunter2' }), { status: 500 }))
    const error = await newsClient.search(request, FIRST_PAGE).catch((e: Error) => e)
    expect(String(error)).not.toContain('hunter2')
  })
})

describe('newsClient.sources', () => {
  it('reads the list of sources', async () => {
    stubFetch(Response.json({ sources: [{ id: 'a', name: 'A' }], demo: true }))
    await expect(newsClient.sources()).resolves.toEqual({ sources: [{ id: 'a', name: 'A' }], demo: true })
  })
})
