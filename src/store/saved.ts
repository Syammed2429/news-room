import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { articleSchema, MAX_SAVED } from '@shared/schemas'
import type { Article } from '@shared/news'

interface SavedState {
  // newest first
  articles: Article[]
  toggle: (article: Article) => void
}

// localStorage can hold anything, so keep the articles that pass the checks and drop the rest.
// One bad entry shouldn't cost the reader everything they saved.
const validArticles = (stored: unknown): Article[] => {
  const list = (stored as { articles?: unknown } | null)?.articles
  if (!Array.isArray(list)) return []
  return list
    .flatMap((item) => {
      const parsed = articleSchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    })
    .slice(0, MAX_SAVED)
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set) => ({
      articles: [],
      // saving past the limit pushes the oldest one out
      toggle: (article) =>
        set((state) =>
          state.articles.some((saved) => saved.id === article.id)
            ? { articles: state.articles.filter((saved) => saved.id !== article.id) }
            : { articles: [article, ...state.articles].slice(0, MAX_SAVED) },
        ),
    }),
    {
      name: 'news-saved',
      version: 1,
      partialize: ({ articles }) => ({ articles }),
      merge: (stored, current) => ({ ...current, articles: validArticles(stored) }),
    },
  ),
)
