import { create } from 'zustand'
import { toggleItem } from '@/lib/collections'
import { DEFAULT_URL_STATE, parseUrlState } from '@/lib/urlState'
import type { ArticleFilters, FeedView } from '@/types/filters'
import type { Category, ProviderId, Sort } from '@shared/news'

export type { FeedView } from '@/types/filters'

interface SearchState extends ArticleFilters {
  view: FeedView
  // what is typed in the search box; query is the part that has been searched for
  draft: string
  setView: (view: FeedView) => void
  setDraft: (draft: string) => void
  setQuery: (query: string) => void
  clearSearch: () => void
  setCategory: (category: Category | null) => void
  setSort: (sort: Sort) => void
  toggleProvider: (id: ProviderId) => void
  setFrom: (from: string | undefined) => void
  setTo: (to: string | undefined) => void
  resetFilters: () => void
  // search text and every filter
  resetAll: () => void
}

const initialFilters: ArticleFilters = {
  query: DEFAULT_URL_STATE.query,
  category: DEFAULT_URL_STATE.category,
  providerIds: DEFAULT_URL_STATE.providerIds,
  sort: DEFAULT_URL_STATE.sort,
}

// a shared link or a refresh brings the page back to where it was
const fromUrl = () => parseUrlState(window.location.search)

export const useSearchStore = create<SearchState>()((set) => ({
  ...initialFilters,
  ...fromUrl(),
  view: fromUrl().view ?? DEFAULT_URL_STATE.view,
  draft: fromUrl().query ?? '',
  setView: (view) => set({ view }),
  setDraft: (draft) => set({ draft }),
  setQuery: (query) => set({ query }),
  clearSearch: () => set({ draft: '', query: '' }),
  setCategory: (category) => set({ category }),
  setSort: (sort) => set({ sort }),
  toggleProvider: (id) => set((s) => ({ providerIds: toggleItem(s.providerIds, id) })),
  setFrom: (from) => set({ from }),
  setTo: (to) => set({ to }),
  resetFilters: () =>
    set({ category: null, providerIds: [], from: undefined, to: undefined }),
  resetAll: () => set({ ...initialFilters, from: undefined, to: undefined, draft: '' }),
}))
