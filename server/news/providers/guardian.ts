import type { Article, NewsProvider, SearchParams } from '@shared/news'
import { buildUrl, fetchJson } from '../../http/fetchJson'
import { mapCategories } from '../categories'
import { PAGE_SIZE } from '../constants'
import { htmlToText, quotedList, safeImageUrl, safeUrl } from '../text'

const ENDPOINT = 'https://content.guardianapis.com/search'

// the Guardian has no health section, society is the closest
const SECTIONS = {
  world: 'world',
  politics: 'politics',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'society',
  sports: 'sport',
  entertainment: 'culture',
} as const

interface GuardianResult {
  id: string
  webTitle: string
  webUrl: string
  webPublicationDate: string
  sectionName?: string
  fields?: { thumbnail?: string; trailText?: string; byline?: string }
}

interface GuardianResponse {
  response: { currentPage: number; pages: number; results: GuardianResult[] | null }
}

const toArticle = (item: GuardianResult): Article | undefined => {
  const url = safeUrl(item.webUrl)
  if (!url) return undefined
  const imageUrl = safeImageUrl(item.fields?.thumbnail)
  const author = item.fields?.byline?.trim()
  return {
    id: `guardian:${item.id}`,
    provider: 'guardian',
    title: item.webTitle,
    summary: htmlToText(item.fields?.trailText),
    url,
    ...(imageUrl && { imageUrl }),
    publisher: 'The Guardian',
    ...(item.sectionName && { section: item.sectionName }),
    ...(author && { author }),
    publishedAt: item.webPublicationDate,
  }
}

// no author filter in this API, so names go into the search text
const buildQuery = ({ query, authors }: SearchParams): string | undefined => {
  const parts = [
    query && `(${query})`,
    authors.length > 0 && `(${quotedList(authors, ' OR ')})`,
  ]
  return parts.filter(Boolean).join(' AND ') || undefined
}

export const createGuardianProvider = (apiKey: string): NewsProvider => ({
  id: 'guardian',
  name: 'The Guardian',
  search: async (params, page, signal) => {
    const sections = mapCategories(params.categories, SECTIONS)
    if (params.categories.length > 0 && sections.length === 0) return { articles: [], hasMore: false }

    const { response } = await fetchJson<GuardianResponse>(
      buildUrl(ENDPOINT, {
        'api-key': apiKey,
        q: buildQuery(params),
        section: sections.join('|'),
        'from-date': params.from,
        'to-date': params.to,
        'order-by': params.query ? 'relevance' : 'newest',
        'show-fields': 'thumbnail,trailText,byline',
        'page-size': PAGE_SIZE,
        page,
      }),
      { signal },
    )
    const articles = (response.results ?? []).map(toArticle).filter((a): a is Article => a !== undefined)
    return { articles, hasMore: response.currentPage < response.pages }
  },
})
