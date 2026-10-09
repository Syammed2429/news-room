import type { Article, Category, ProviderId } from '@shared/news'
import type { ArticleFilters } from '@/types/filters'

// On "For you" the reader's filters can only narrow what their preferences allow. An empty
// preference list allows everything.
export const withinSources = (chosen: ProviderId[], preferred: ProviderId[]): ProviderId[] =>
  preferred.length === 0 ? chosen : chosen.filter((id) => preferred.includes(id))

export const withinCategories = (chosen: Category | null, preferred: Category[]): Category | null =>
  chosen && (preferred.length === 0 || preferred.includes(chosen)) ? chosen : null

const includesIgnoreCase = (text: string | undefined, part: string) =>
  text?.toLowerCase().includes(part.toLowerCase()) ?? false

// Saved articles live on this device, so the filters run here instead of on the server.
// Dates compare the calendar day, the same way the server does.
export const matchesSavedFilters = (
  article: Article,
  { query, providerIds, from, to }: Pick<ArticleFilters, 'query' | 'providerIds' | 'from' | 'to'>,
): boolean => {
  const day = article.publishedAt.slice(0, 10)
  return (
    (providerIds.length === 0 || providerIds.includes(article.provider)) &&
    (!query ||
      includesIgnoreCase(article.title, query) ||
      includesIgnoreCase(article.summary, query) ||
      includesIgnoreCase(article.author, query) ||
      includesIgnoreCase(article.publisher, query)) &&
    (!from || day >= from) &&
    (!to || day <= to)
  )
}
