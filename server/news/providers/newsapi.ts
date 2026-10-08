import type { Article, Category, NewsProvider, SearchParams } from '@shared/news'
import { buildUrl, fetchJson } from '../../http/fetchJson'
import { mapCategories } from '../categories'
import { PAGE_SIZE } from '../constants'
import { htmlToText, quotedList, safeImageUrl, safeUrl } from '../text'

const BASE = 'https://newsapi.org/v2'
// the free plan stops at 100 results
const MAX_RESULTS = 100
const REMOVED = '[Removed]'

const HEADLINE_CATEGORIES: Partial<Record<Category, string>> = {
  world: 'general',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'health',
  sports: 'sports',
  entertainment: 'entertainment',
}

const CATEGORY_KEYWORDS: Partial<Record<Category, string>> = {
  world: 'world',
  politics: 'politics',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'health',
  sports: 'sports',
  entertainment: 'entertainment',
}

interface NewsApiArticle {
  source: { name: string | null }
  author: string | null
  title: string | null
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
}

interface NewsApiResponse {
  totalResults: number
  articles: NewsApiArticle[]
}

const isUsable = (item: NewsApiArticle) => item.title !== null && item.title !== REMOVED

const toArticle = (item: NewsApiArticle): Article | undefined => {
  const url = safeUrl(item.url)
  if (!url) return undefined
  const imageUrl = safeImageUrl(item.urlToImage)
  const author = item.author?.trim()
  return {
    id: `newsapi:${url}`,
    provider: 'newsapi',
    title: item.title ?? '',
    summary: htmlToText(item.description),
    url,
    ...(imageUrl && { imageUrl }),
    publisher: item.source.name ?? 'NewsAPI',
    ...(author && { author }),
    publishedAt: item.publishedAt,
  }
}

const orGroup = (terms: string[]) => (terms.length > 0 ? `(${quotedList(terms, ' OR ')})` : '')

// one call we plan to make
interface PlannedRequest {
  endpoint: 'everything' | 'top-headlines'
  q?: string
  category?: string
}

// top-headlines can filter by category but not by date, and everything is the other way
// round. So pick one per search, and fall back to keywords when a category has no match.
const planRequests = (params: SearchParams): PlannedRequest[] => {
  const hasDates = Boolean(params.from || params.to)
  const hasCategoryWithoutHeadlines = params.categories.some((c) => !HEADLINE_CATEGORIES[c])
  const keywords = mapCategories(params.categories, CATEGORY_KEYWORDS)
  const headlineCategories = mapCategories(params.categories, HEADLINE_CATEGORIES)

  if (hasDates || hasCategoryWithoutHeadlines || params.authors.length > 0) {
    const q = [params.query && `(${params.query})`, orGroup(params.authors), orGroup(keywords)]
      .filter(Boolean)
      .join(' AND ')
    return [{ endpoint: 'everything', q: q || 'news' }]
  }
  if (headlineCategories.length > 0) {
    return headlineCategories.map((category) => ({
      endpoint: 'top-headlines',
      q: params.query,
      category,
    }))
  }
  return [{ endpoint: 'top-headlines', q: params.query }]
}

export const createNewsApiProvider = (apiKey: string): NewsProvider => {
  const run = (
    request: PlannedRequest,
    params: SearchParams,
    page: number,
    signal?: AbortSignal,
  ) => {
    const everything = request.endpoint === 'everything'
    return fetchJson<NewsApiResponse>(
      buildUrl(`${BASE}/${request.endpoint}`, {
        q: request.q,
        category: request.category,
        country: everything ? undefined : 'us',
        from: params.from,
        to: params.to,
        sortBy: everything ? (params.query ? 'relevancy' : 'publishedAt') : undefined,
        language: everything ? 'en' : undefined,
        pageSize: PAGE_SIZE,
        page,
      }),
      // the key goes in a header so it never ends up in a URL or a log
      { signal, headers: { 'X-Api-Key': apiKey } },
    )
  }

  return {
    id: 'newsapi',
    name: 'NewsAPI',
    search: async (params, page, signal) => {
      const responses = await Promise.all(
        planRequests(params).map((request) => run(request, params, page, signal)),
      )
      return {
        articles: responses.flatMap((r) =>
          r.articles
            .filter(isUsable)
            .map(toArticle)
            .filter((a): a is Article => a !== undefined),
        ),
        hasMore: responses.some((r) => page * PAGE_SIZE < Math.min(r.totalResults, MAX_RESULTS)),
      }
    },
  }
}
