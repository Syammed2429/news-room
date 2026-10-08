import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queryTextSchema } from '@shared/schemas'

export const MAX_RECENT = 5

interface RecentState {
  // newest first
  searches: string[]
  add: (query: string) => void
  clear: () => void
}

const sameSearch = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// whatever is in localStorage has to pass the same checks as a typed search
const validSearches = (stored: unknown): string[] => {
  const list = (stored as { searches?: unknown } | null)?.searches
  if (!Array.isArray(list)) return []
  const valid = list.flatMap((item) => {
    const parsed = queryTextSchema.safeParse(item)
    return parsed.success && parsed.data ? [parsed.data] : []
  })
  return valid.filter((search, i) => valid.findIndex((other) => sameSearch(other, search)) === i).slice(0, MAX_RECENT)
}

export const useRecentStore = create<RecentState>()(
  persist(
    (set) => ({
      searches: [],
      add: (query) => {
        const search = query.trim()
        if (!search) return
        set((state) => ({
          searches: [search, ...state.searches.filter((other) => !sameSearch(other, search))].slice(0, MAX_RECENT),
        }))
      },
      clear: () => set({ searches: [] }),
    }),
    {
      name: 'news-recent-searches',
      version: 1,
      partialize: ({ searches }) => ({ searches }),
      merge: (stored, current) => ({ ...current, searches: validSearches(stored) }),
    },
  ),
)
