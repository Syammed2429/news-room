import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toggleItem } from '@/lib/collections'
import type { Preferences } from '@/types/filters'
import { MAX_AUTHORS, preferencesSchema } from '@shared/schemas'
import type { Category, ProviderId } from '@shared/news'

interface PreferencesState extends Preferences {
  toggleProvider: (id: ProviderId) => void
  keepProviders: (known: ProviderId[]) => void
  toggleCategory: (category: Category) => void
  toggleAuthor: (author: string) => void
  clear: () => void
}

const empty: Preferences = { providerIds: [], categories: [], authors: [] }

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...empty,
      toggleProvider: (id) => set((s) => ({ providerIds: toggleItem(s.providerIds, id) })),
      keepProviders: (known) =>
        set((s) => (s.providerIds.every((id) => known.includes(id)) ? s : { providerIds: s.providerIds.filter((id) => known.includes(id)) })),
      toggleCategory: (category) => set((s) => ({ categories: toggleItem(s.categories, category) })),
      // the API takes at most MAX_AUTHORS names
      toggleAuthor: (author) =>
        set((s) => {
          const authors = toggleItem(s.authors, author)
          return authors.length > MAX_AUTHORS ? s : { authors }
        }),
      clear: () => set(empty),
    }),
    {
      name: 'news-preferences',
      version: 1,
      partialize: ({ providerIds, categories, authors }) => ({ providerIds, categories, authors }),
      // localStorage can hold anything (old versions, hand edits), so only use it if it matches the schema
      merge: (stored, current) => {
        const parsed = preferencesSchema.safeParse((stored as { state?: unknown } | null)?.state ?? stored)
        return parsed.success ? { ...current, ...parsed.data } : current
      },
    },
  ),
)
