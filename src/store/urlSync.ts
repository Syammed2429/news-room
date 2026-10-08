import { DEFAULT_URL_STATE, parseUrlState, toSearch } from '@/lib/urlState'
import { useSearchStore } from './search'

// Keeps the address bar and the search store in step, in both directions. It's a plain
// subscription plus a popstate listener, started once, so no effect hook is needed.
export const startUrlSync = () => {
  // Back and Forward: read the page state from the URL again
  const readUrl = () => {
    const state = parseUrlState(window.location.search)
    useSearchStore.setState({ ...DEFAULT_URL_STATE, ...state, draft: state.query ?? '' })
  }
  window.addEventListener('popstate', readUrl)

  const unsubscribe = useSearchStore.subscribe((state, previous) => {
    const next = toSearch(state)
    if (next === window.location.search) return

    // Typing changes the query on every pause, so it replaces the history entry instead of
    // filling the Back button with half-typed searches. Picking a filter is a step worth undoing.
    const onlyTheQueryChanged = toSearch({ ...previous, query: state.query }) === next
    const target = `${window.location.pathname}${next}`
    if (onlyTheQueryChanged) window.history.replaceState(null, '', target)
    else window.history.pushState(null, '', target)
  })

  return () => {
    window.removeEventListener('popstate', readUrl)
    unsubscribe()
  }
}
