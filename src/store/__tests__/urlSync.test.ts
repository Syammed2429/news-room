import { afterEach, describe, expect, it, vi } from 'vitest'

// The store reads the URL when it is created, so each test loads a fresh copy at a chosen address.
const load = async (url: string) => {
  window.history.replaceState(null, '', url)
  vi.resetModules()
  const { useSearchStore } = await import('../search')
  const { startUrlSync } = await import('../urlSync')
  return { useSearchStore, startUrlSync }
}

let stop: (() => void) | undefined

afterEach(() => {
  stop?.()
  stop = undefined
  window.history.replaceState(null, '', '/')
})

describe('starting from the address', () => {
  it('restores the search, filters and tab from a shared link', async () => {
    const { useSearchStore } = await load('/?q=climate&category=science&sources=guardian,nyt&from=2025-01-05&view=feed')
    expect(useSearchStore.getState()).toMatchObject({
      query: 'climate',
      draft: 'climate',
      category: 'science',
      providerIds: ['guardian', 'nyt'],
      from: '2025-01-05',
      view: 'feed',
    })
  })

  it('falls back to the defaults for a broken link', async () => {
    const { useSearchStore } = await load('/?category=gossip&view=admin&from=nope')
    const state = useSearchStore.getState()
    expect(state).toMatchObject({ category: null, view: 'latest', query: '' })
    expect(state.from).toBeUndefined()
  })
})

describe('keeping the address up to date', () => {
  it('adds a history entry when a filter changes, so Back undoes it', async () => {
    const { useSearchStore, startUrlSync } = await load('/')
    stop = startUrlSync()
    const before = window.history.length

    useSearchStore.getState().setCategory('sports')

    expect(window.location.search).toBe('?category=sports')
    expect(window.history.length).toBe(before + 1)
  })

  it('replaces the entry while typing, so Back is not filled with half-typed searches', async () => {
    const { useSearchStore, startUrlSync } = await load('/')
    stop = startUrlSync()
    const before = window.history.length

    useSearchStore.getState().setQuery('clim')
    useSearchStore.getState().setQuery('climate')

    expect(window.location.search).toBe('?q=climate')
    expect(window.history.length).toBe(before)
  })

  it('leaves the address alone while text is only in the search box', async () => {
    const { useSearchStore, startUrlSync } = await load('/')
    stop = startUrlSync()
    const before = window.history.length

    useSearchStore.getState().setDraft('half typed')

    expect(window.location.search).toBe('')
    expect(window.history.length).toBe(before)
  })

  it('returns to a clean address when everything is cleared', async () => {
    const { useSearchStore, startUrlSync } = await load('/?q=x&category=health')
    stop = startUrlSync()

    useSearchStore.getState().resetAll()

    expect(window.location.search).toBe('')
  })

  it('follows Back and Forward by reading the address again', async () => {
    const { useSearchStore, startUrlSync } = await load('/?q=climate')
    stop = startUrlSync()

    window.history.replaceState(null, '', '/?category=sports')
    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(useSearchStore.getState()).toMatchObject({ category: 'sports', query: '', draft: '' })
  })

  it('does not write the address back when it was the address that changed', async () => {
    const { startUrlSync } = await load('/')
    stop = startUrlSync()
    const before = window.history.length

    window.history.replaceState(null, '', '/?category=sports')
    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(window.history.length).toBe(before)
  })

  it('stops listening once stopped', async () => {
    const { useSearchStore, startUrlSync } = await load('/')
    const stopSync = startUrlSync()
    stopSync()

    useSearchStore.getState().setCategory('sports')

    expect(window.location.search).toBe('')
  })
})
