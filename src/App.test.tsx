import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NewsSearchBody, SourcesResponse } from '@shared/api'
import type { Article } from '@shared/news'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { usePreferencesStore } from './store/preferences'
import { useRecentStore } from './store/recent'
import { useSavedStore } from './store/saved'
import { useSearchStore } from './store/search'
import { NEW_ARTICLES_POLL_MS } from './hooks/useNewArticles'

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

// stories "published" after the page loaded, newest first
const justPublished: Article[] = []

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
    [...justPublished, ...FIXTURE].filter(
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
  justPublished.length = 0
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
  useSavedStore.setState({ articles: [] })
  useRecentStore.setState({ searches: [] })
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
      // each title also carries a screen-reader-only "(opens in a new tab)"
      expect(titles).toEqual([expect.stringContaining('Telescope captures earliest galaxy')])
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

    // only the articles written by the author we followed
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    screen.getAllByRole('article').forEach((card) => expect(card).toHaveTextContent(author))
  })

  it('says so when a followed author has nothing, and offers the latest news', async () => {
    const user = userEvent.setup()
    usePreferencesStore.setState({ authors: ['Nobody Known'] })
    renderApp()

    await user.click(screen.getByRole('tab', { name: /for you/i }))

    expect(await screen.findByText(/nothing from your picks yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no recent articles by nobody known/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /show the latest news/i }))

    expect(screen.getByRole('tab', { name: /latest/i })).toHaveAttribute('aria-selected', 'true')
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

  it('offers sorting only while searching, and sends the choice to the server', async () => {
    const user = userEvent.setup()
    renderApp()
    await screen.findAllByRole('article')
    expect(screen.queryByRole('group', { name: /sort results/i })).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: /search articles/i }), 'telescope{enter}')
    const group = await screen.findByRole('group', { name: /sort results/i })
    expect(within(group).getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(group).getByRole('button', { name: 'Most relevant' }))

    await waitFor(() => {
      const bodies = fakeBackend.mock.calls
        .filter(([url]) => url.endsWith('/search'))
        .map(([, init]) => JSON.parse(String(init?.body)) as NewsSearchBody)
      expect(bodies.at(-1)?.request.queries[0]?.sort).toBe('relevance')
    })
  })

  describe('new articles', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      vi.stubGlobal('scrollTo', vi.fn())
    })
    afterEach(() => vi.useRealTimers())

    const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

    it('says nothing while nothing new has been published', async () => {
      renderApp()
      await screen.findAllByRole('article')

      await wait(NEW_ARTICLES_POLL_MS + 1000)

      expect(screen.queryByRole('button', { name: /new article/i })).not.toBeInTheDocument()
    })

    it('tells the reader about a newer story, and a tap refreshes the list', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderApp()
      await screen.findAllByRole('article')

      justPublished.push(article(9, 'Breaking: a fresh story', 'Ada Newsworthy'))
      await wait(NEW_ARTICLES_POLL_MS + 1000)

      await user.click(await screen.findByRole('button', { name: /1 new article$/i }))

      expect(await screen.findByRole('heading', { name: /breaking: a fresh story/i })).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('button', { name: /new article/i })).not.toBeInTheDocument())
    })

    it('does not check on the Saved tab, which never talks to the server', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderApp()
      await screen.findAllByRole('article')
      await user.click(screen.getByRole('tab', { name: /saved/i }))
      fakeBackend.mockClear()

      await wait(NEW_ARTICLES_POLL_MS * 2)

      expect(fakeBackend.mock.calls.filter(([url]) => url.endsWith('/search'))).toHaveLength(0)
    })
  })

  describe('recent searches', () => {
    const box = () => screen.getByRole('textbox', { name: /search articles/i })

    it('remembers a search when the reader presses Enter', async () => {
      const user = userEvent.setup()
      renderApp()
      await screen.findAllByRole('article')

      await user.type(box(), 'telescope{enter}')

      expect(useRecentStore.getState().searches).toEqual(['telescope'])
    })

    it('remembers a search when the reader leaves the box, but not half-typed words', async () => {
      const user = userEvent.setup()
      renderApp()
      await screen.findAllByRole('article')

      await user.type(box(), 'markets')
      expect(useRecentStore.getState().searches).toEqual([]) // still typing

      await user.tab()
      expect(useRecentStore.getState().searches).toEqual(['markets'])
    })

    it('shows them only while the box is empty, and a click runs the search', async () => {
      const user = userEvent.setup()
      useRecentStore.setState({ searches: ['telescope', 'markets'] })
      renderApp()
      await screen.findAllByRole('article')

      const group = screen.getByRole('group', { name: /recent searches/i })
      await user.click(within(group).getByRole('button', { name: 'telescope' }))

      expect(box()).toHaveValue('telescope')
      expect(useSearchStore.getState().query).toBe('telescope')
      expect(screen.queryByRole('group', { name: /recent searches/i })).not.toBeInTheDocument()
    })

    it('can be cleared', async () => {
      const user = userEvent.setup()
      useRecentStore.setState({ searches: ['telescope'] })
      renderApp()

      await user.click(within(screen.getByRole('group', { name: /recent searches/i })).getByRole('button', { name: /clear/i }))

      expect(useRecentStore.getState().searches).toEqual([])
      expect(screen.queryByRole('group', { name: /recent searches/i })).not.toBeInTheDocument()
    })
  })

  describe('saved articles', () => {
    const saveButtons = () => screen.findAllByRole('button', { name: /^save for later/i })

    it('saves an article, lists it under Saved, and removes it again', async () => {
      const user = userEvent.setup()
      renderApp()
      const [first] = await saveButtons()
      if (!first) throw new Error('no save button')
      expect(first).toHaveAttribute('aria-pressed', 'false')

      await user.click(first)
      expect(useSavedStore.getState().articles).toHaveLength(1)
      expect(screen.getByRole('tab', { name: /saved\s*1/i })).toBeInTheDocument()

      await user.click(screen.getByRole('tab', { name: /saved/i }))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Saved articles')
      expect(await screen.findAllByRole('article')).toHaveLength(1)
      expect(screen.getByText(/1 saved article$/i)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /^remove from saved/i }))
      expect(await screen.findByText(/nothing saved yet/i)).toBeInTheDocument()
    })

    it('never asks the server while on the Saved tab', async () => {
      const user = userEvent.setup()
      renderApp()
      await screen.findAllByRole('article')
      fakeBackend.mockClear()

      await user.click(screen.getByRole('tab', { name: /saved/i }))
      await screen.findByText(/nothing saved yet/i)

      expect(fakeBackend.mock.calls.filter(([url]) => url.endsWith('/search'))).toHaveLength(0)
    })

    it('offers a way back from the empty page', async () => {
      const user = userEvent.setup()
      renderApp()
      await user.click(screen.getByRole('tab', { name: /saved/i }))
      await user.click(await screen.findByRole('button', { name: /browse the latest news/i }))
      expect(screen.getByRole('tab', { name: /latest/i })).toHaveAttribute('aria-selected', 'true')
    })

    it('filters the saved list by keyword on this device, and says how many match', async () => {
      useSavedStore.setState({ articles: FIXTURE.slice(0, 2) })
      useSearchStore.setState({ view: 'saved', query: 'galaxy', draft: 'galaxy' })
      renderApp()

      expect(await screen.findAllByRole('article')).toHaveLength(1)
      expect(screen.getByText(/1 of 2 saved articles/i)).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /search articles/i })).toHaveValue('galaxy')
    })

    it('offers a way out when no saved article matches the filters', async () => {
      const user = userEvent.setup()
      useSavedStore.setState({ articles: FIXTURE.slice(0, 1) })
      useSearchStore.setState({ view: 'saved', from: '2030-01-01' })
      renderApp()

      expect(await screen.findByText(/no articles found/i)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /clear search and filters/i }))
      expect(await screen.findAllByRole('article')).toHaveLength(1)
    })
  })

  describe('filters on the For you tab', () => {
    it('only offers the categories from the preferences', async () => {
      usePreferencesStore.setState({ providerIds: [], categories: ['science', 'health'], authors: [] })
      useSearchStore.setState({ view: 'feed' })
      renderApp()
      await screen.findAllByRole('article')

      const chips = within(screen.getByRole('navigation', { name: 'Categories' }))
      expect(chips.getAllByRole('button').map((b) => b.textContent)).toEqual(['All', 'Science', 'Health'])
    })

    it('narrows the request to the picked category instead of widening it', async () => {
      const user = userEvent.setup()
      usePreferencesStore.setState({ providerIds: [], categories: ['science', 'health'], authors: [] })
      useSearchStore.setState({ view: 'feed' })
      renderApp()
      await screen.findAllByRole('article')
      fakeBackend.mockClear()

      await user.click(within(screen.getByRole('navigation', { name: 'Categories' })).getByRole('button', { name: 'Health' }))
      await waitFor(() => expect(fakeBackend).toHaveBeenCalled())

      const body = JSON.parse(String(fakeBackend.mock.calls.find(([url]) => url.endsWith('/search'))?.[1]?.body)) as NewsSearchBody
      expect(body.request.queries[0]?.categories).toEqual(['health'])
    })

    it('shows the category chips on a feed with no category preferences', async () => {
      usePreferencesStore.setState({ providerIds: [], categories: [], authors: ['Maya Chen'] })
      useSearchStore.setState({ view: 'feed' })
      renderApp()
      await screen.findAllByRole('article')
      const chips = within(screen.getByRole('navigation', { name: 'Categories' }))
      expect(chips.getAllByRole('button')).toHaveLength(9)
    })
  })

  it('has one top-level heading that follows the tab', async () => {
    const user = userEvent.setup()
    renderApp()
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Latest news')

    await user.click(screen.getByRole('tab', { name: /for you/i }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your news feed')
  })

  it('makes the follow buttons big enough to tap', async () => {
    renderApp()
    const [button] = await screen.findAllByTitle(/^Follow /)
    expect(button).toHaveClass('min-h-6')
  })

  it('offers a skip link for keyboard users', async () => {
    renderApp()
    const skip = await screen.findByRole('link', { name: /skip to articles/i })
    expect(skip).toHaveAttribute('href', '#content')
  })
})
