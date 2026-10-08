import type { Article, Category, NewsProvider, ProviderPage, SearchParams } from '@shared/news'
import { CATEGORIES, CATEGORY_LABELS } from '@shared/news'
import { PAGE_SIZE } from '../constants'
import { includesIgnoreCase } from '../text'

// fake articles for running without API keys

const AUTHORS = ['Maya Chen', 'Daniel Okafor', 'Sofia Rossi', 'Liam Andersson', 'Priya Nair', 'Jonas Weber']

const HEADLINES: Record<Category, string[]> = {
  world: ['Leaders agree on new climate accord', 'Coastal cities brace for record tides', 'Trade talks resume after months of delay'],
  politics: ['Parliament passes landmark digital privacy bill', 'Election commission outlines new voting rules', 'Coalition faces test over budget plan'],
  business: ['Markets rally as inflation cools', 'Startups pivot to profitability over growth', 'Retail giants rethink supply chains'],
  technology: ['Open-source model rivals proprietary systems', 'Chipmakers race to expand capacity', 'Browsers adopt new privacy standard'],
  science: ['Telescope captures earliest galaxy yet', 'Researchers map the deep ocean microbiome', 'New battery chemistry doubles range'],
  health: ['Study links sleep habits to heart health', 'Hospitals trial AI triage assistants', 'Vaccine rollout reaches rural clinics'],
  sports: ['Underdogs clinch title in dramatic final', 'Veteran sprinter sets season-best time', 'League unveils expanded playoff format'],
  entertainment: ['Festival unveils record lineup', 'Indie film sweeps top awards', 'Streaming platforms bundle for subscribers'],
}

const ARTICLES_PER_PROVIDER = 60

type Sample = Article & { category: Category }

const generate = (providerId: string, publisher: string, seed: number): Sample[] => {
  const now = Date.now()
  return Array.from({ length: ARTICLES_PER_PROVIDER }, (_, i) => {
    const category = CATEGORIES[(i + seed) % CATEGORIES.length] ?? 'world'
    const headlines = HEADLINES[category]
    const headline = headlines[Math.floor(i / CATEGORIES.length) % headlines.length] ?? ''
    const id = `${providerId}:${i}`
    const author = AUTHORS[(i * 3 + seed) % AUTHORS.length]
    return {
      id,
      provider: providerId,
      title: headline,
      summary: `${publisher} reports on developments in ${CATEGORY_LABELS[category].toLowerCase()}. This is sample content shown because no API keys are configured.`,
      url: `https://example.com/${providerId}/${i}`,
      ...(i % 4 !== 3 && { imageUrl: `https://picsum.photos/seed/${id}/640/360` }),
      publisher,
      section: CATEGORY_LABELS[category],
      ...(author && { author }),
      publishedAt: new Date(now - (i * 7 + seed) * 3_600_000 * 5).toISOString(),
      category,
    }
  })
}

const matches = (article: Sample, params: SearchParams): boolean => {
  const day = article.publishedAt.slice(0, 10)
  return (
    (!params.query ||
      includesIgnoreCase(article.title, params.query) ||
      includesIgnoreCase(article.summary, params.query)) &&
    (params.categories.length === 0 || params.categories.includes(article.category)) &&
    (params.authors.length === 0 || params.authors.some((a) => includesIgnoreCase(article.author, a))) &&
    (!params.from || day >= params.from) &&
    (!params.to || day <= params.to)
  )
}

export const createMockProvider = (id: string, name: string, seed: number): NewsProvider => {
  const catalogue = generate(id, name, seed)
  return {
    id,
    name,
    search: async (params, page): Promise<ProviderPage> => {
      await new Promise((resolve) => setTimeout(resolve, 350)) // fake a little latency
      const matching = catalogue.filter((article) => matches(article, params))
      const start = (page - 1) * PAGE_SIZE
      return {
        articles: matching.slice(start, start + PAGE_SIZE),
        hasMore: start + PAGE_SIZE < matching.length,
      }
    },
  }
}
