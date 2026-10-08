import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NewsSearchBody, SourcesResponse } from '@shared/api'
import type { Article } from '@shared/news'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { usePreferencesStore } from './store/preferences'
import { useSearchStore } from './store/search'

const article = (n: number, title: string, author: string): Article => ({
  id: `a:${n}`,
  provider: 'a',
  title,
  summary: `Summary of ${title}`,
  url: `https://example.com/${n}`,
  publisher: 'Test Wire',
  section: 'Science',
  author,
  ...(n === 1 && { imageUrl: 'https://cdn.example/1.jpg' }),
  publishedAt: new Date(Date.UTC(2025, 0, 10 - n)).toISOString(),
})

const FIXTURE = [
  article(1, 'Telescope captures earliest galaxy', 'Maya Chen'),
  article(2, 'Markets rally as inflation cools', 'Liam Andersson'),
  article(3, 'Browsers adopt new privacy standard', 'Maya Chen'),
]

const sources: SourcesResponse = { sources: [{ id: 'a', name: 'Test Wire' }], demo: true }

// fake backend that filters the fixture like the real API does
const defaultBackend = async (url: string, init?: RequestInit) => {
  if (url.endsWith('/sources')) return Response.json(sources)

  const { request } = JSON.parse(String(init?.body)) as NewsSearchBody
  const articles = request.queries.flatMap(({ query, authors }) =>
    FIXTURE.filter(
      (a) =>
        a.title.toLowerCase().includes(query.toLowerCase()) &&
        (authors.length === 0 || authors.some((name) => a.author?.includes(name))),
    ),
  )
  return Response.json({ articles, failures: [] })
}

const fakeBackend = vi.fn(defaultBackend)

const renderApp = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fakeBackend.mockImplementation(defaultBackend)
  vi.stubGlobal('fetch', fakeBackend)
  useSearchStore.setState({
    view: 'latest',
    query: '',
    draft: '',
    category: null,
    providerIds: [],
    from: undefined,
    to: undefined,
  })
  usePreferencesStore.setState({ providerIds: [], categories: [], authors: [] })
})

afterEach(() => {
  vi.unstubAllGlobals()
  fakeBackend.mockClear()
})

describe('App', () => {
  it('lists articles and filters them by keyword', async () => {
    const user = userEvent.setup()
    renderApp()

    expect(await screen.findAllByRole('article')).toHaveLength(3)

    await user.type(screen.getByRole('textbox', { name: /search articles/i }), 'telescope{enter}')

    await waitFor(() => {
      const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
      expect(titles).toEqual(['Telescope captures earliest galaxy'])
    })
  })

  describe('search as you type', () => {
    const searchedFor = () =>
      fakeBackend.mock.calls
        .filter(([url]) => url.endsWith('/search'))
        .map(([, init]) => (JSON.parse(String(init?.body)) as NewsSearchBody).request.queries[0]?.query)

    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
    afterEach(() => vi.useRealTimers())

    it('waits for a pause in typing, then sends one request', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderApp()
      await screen.findAllByRole('article')

      await user.type(screen.getByRole('textbox', { name: /search articles/i }), 'telescope')
      expect(searchedFor()).not.toContain('telescope')

      await act(() => vi.advanceTimersByTimeAsync(500))
      await waitFor(() => expect(searchedFor()).toContain('telescope'))
      // only the empty first load and the final word, nothing per keystroke
      expect(searchedFor()).toEqual(['', 'telescope'])
    })

    it('does not search for a single letter', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderApp()
      await screen.findAllByRole('article')

      await user.type(screen.getByRole('textbox', { name: /search articles/i }), 't')
      await act(() => vi.advanceTimersByTimeAsync(1000))

      expect(searchedFor()).toEqual([''])
    })

    it('searches right away on Enter', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderApp()
      await screen.findAllByRole('article')

      await user.type(screen.getByRole('textbox', { name: /search articles/i }), 'markets{enter}')

      await waitFor(() => expect(searchedFor()).toContain('markets'))
    })

    it('clears the search with the X button', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderApp()
      await screen.findAllByRole('article')

      const box = screen.getByRole('textbox', { name: /search articles/i })
      await user.type(box, 'markets{enter}')
      await user.click(screen.getByRole('button', { name: /clear search/i }))

      expect(box).toHaveValue('')
      expect(useSearchStore.getState().query).toBe('')
    })
  })

  it('clears the search text from the empty state too', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findAllByRole('article')

    const box = screen.getByRole('textbox', { name: /search articles/i })
    await user.type(box, 'zzzzzz{enter}')
    await user.click(await screen.findByRole('button', { name: /clear search and filters/i }))

    expect(box).toHaveValue('')
    expect(useSearchStore.getState().query).toBe('')
    expect(await screen.findAllByRole('article')).toHaveLength(3)
  })

  it('does not bring back cleared text when the debounce timer fires late', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderApp()
    await screen.findAllByRole('article')

    await user.type(screen.getByRole('textbox', { name: /search articles/i }), 'telescope')
    act(() => useSearchStore.getState().resetAll())
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(useSearchStore.getState().query).toBe('')
    vi.useRealTimers()
  })

  it('shows the demo notice when the server is serving sample data', async () => {
    renderApp()
    expect(await screen.findByText(/showing sample articles/i)).toBeInTheDocument()
  })

  it('only ever talks to our own API, never to a news provider', async () => {
    renderApp()
    await screen.findAllByRole('article')
    const urls = fakeBackend.mock.calls.map(([url]) => url)
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((url) => url.startsWith('/api/'))).toBe(true)
  })

  it('asks the reader to personalize when the feed has no preferences', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('tab', { name: /for you/i }))

    expect(await screen.findByText(/your feed is empty/i)).toBeInTheDocument()
  })

  it('builds the feed from followed authors', async () => {
    const user = userEvent.setup()
    renderApp()

    const [firstCard] = await screen.findAllByRole('article')
    const followButton = within(firstCard as HTMLElement).getAllByRole('button', { pressed: false })[0]
    expect(followButton).toBeDefined()
    const author = followButton?.textContent ?? ''
    if (followButton) await user.click(followButton)
    expect(usePreferencesStore.getState().authors).toEqual([author])

    await user.click(screen.getByRole('tab', { name: /for you/i }))

    // the base feed plus the followed author's articles
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3))
    expect(screen.getAllByRole('article').some((card) => card.textContent?.includes(author))).toBe(true)
    expect(screen.queryByText(/no recent articles by/i)).not.toBeInTheDocument()
  })

  it('explains it when none of the followed authors have articles, and still shows news', async () => {
    const user = userEvent.setup()
    usePreferencesStore.setState({ authors: ['Nobody Known'] })
    renderApp()

    await user.click(screen.getByRole('tab', { name: /for you/i }))

    expect(await screen.findByText(/no recent articles by nobody known/i)).toBeInTheDocument()
    expect(await screen.findAllByRole('article')).toHaveLength(3)
  })

  it('shows a retryable error when the API is unreachable', async () => {
    fakeBackend.mockImplementation(async (url: string) => {
      if (url.endsWith('/sources')) return Response.json(sources)
      return new Response('{}', { status: 429 })
    })
    renderApp()
    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('filters by category with one tap on a chip', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findAllByRole('article')

    await user.click(screen.getByRole('button', { name: 'Technology' }))

    await waitFor(() => {
      const bodies = fakeBackend.mock.calls
        .filter(([url]) => url.endsWith('/search'))
        .map(([, init]) => JSON.parse(String(init?.body)) as NewsSearchBody)
      expect(bodies.at(-1)?.request.queries[0]?.categories).toEqual(['technology'])
    })
    expect(screen.getByRole('button', { name: 'Technology' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('features the newest story as the top story on the plain timeline only', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(await screen.findByText('Top story')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /search articles/i }), 'telescope{enter}')
    await waitFor(() => expect(screen.queryByText('Top story')).not.toBeInTheDocument())
  })

  it('shows applied filters as removable chips', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findAllByRole('article')
    expect(screen.queryByRole('list', { name: /active filters/i })).not.toBeInTheDocument()

    useSearchStore.setState({ providerIds: ['a'], from: '2025-01-05' })

    const filters = await screen.findByRole('list', { name: /active filters/i })
    expect(within(filters).getByRole('button', { name: /remove filter: test wire/i })).toBeInTheDocument()
    expect(within(filters).getByRole('button', { name: /remove filter: from 5 jan 2025/i })).toBeInTheDocument()

    await user.click(within(filters).getByRole('button', { name: /clear all/i }))
    expect(useSearchStore.getState()).toMatchObject({ providerIds: [], from: undefined })
  })

  it('offers a skip link for keyboard users', async () => {
    renderApp()
    const skip = await screen.findByRole('link', { name: /skip to articles/i })
    expect(skip).toHaveAttribute('href', '#content')
  })
})
