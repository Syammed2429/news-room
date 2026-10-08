import { create } from 'zustand'
import { toggleItem } from '@/lib/collections'
import type { ArticleFilters } from '@/types/filters'
import type { Category, ProviderId } from '@shared/news'

export type FeedView = 'latest' | 'feed'

interface SearchState extends ArticleFilters {
  view: FeedView
  setView: (view: FeedView) => void
  setQuery: (query: string) => void
  setCategory: (category: Category | null) => void
  toggleProvider: (id: ProviderId) => void
  setFrom: (from: string | undefined) => void
  setTo: (to: string | undefined) => void
  resetFilters: () => void
}

const initialFilters: ArticleFilters = {
  query: '',
  category: null,
  providerIds: [],
  from: undefined,
  to: undefined,
}

export const useSearchStore = create<SearchState>()((set) => ({
  ...initialFilters,
  view: 'latest',
  setView: (view) => set({ view }),
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  toggleProvider: (id) => set((s) => ({ providerIds: toggleItem(s.providerIds, id) })),
  setFrom: (from) => set({ from }),
  setTo: (to) => set({ to }),
  resetFilters: () =>
    set({ category: null, providerIds: [], from: undefined, to: undefined }),
}))
