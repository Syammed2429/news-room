import type { Article, NewsProvider, SearchParams } from '@shared/news'
import { buildUrl, fetchJson } from '../../http/fetchJson'
import { mapCategories } from '../categories'
import { PAGE_SIZE } from '../constants'
import { quotedList, safeImageUrl, safeUrl, stripByline } from '../text'

const ENDPOINT = 'https://api.nytimes.com/svc/search/v2/articlesearch.json'
const IMAGE_HOST = 'https://www.nytimes.com/'
const MAX_PAGES = 100

// The fq filter (news_desk, section_name) returns nothing right now, so categories
// go into q as plain words
const CATEGORY_TERMS = {
  world: 'world',
  politics: 'politics',
  business: 'business',
  technology: 'technology',
  science: 'science',
  health: 'health',
  sports: 'sports',
  entertainment: 'arts',
} as const

interface NytDoc {
  _id: string
  web_url: string
  abstract?: string
  snippet?: string
  headline: { main: string }
  byline?: { original?: string }
  pub_date: string
  section_name?: string
  // both shapes show up in responses
  multimedia?: { default?: { url?: string } } | { url: string; subtype?: string }[]
}

interface NytResponse {
  // no results comes back as docs: null, not []
  response: { docs: NytDoc[] | null; metadata?: { hits: number } }
}

const pickImage = (multimedia: NytDoc['multimedia']): string | undefined => {
  if (!multimedia) return undefined
  if (Array.isArray(multimedia)) {
    const url = (multimedia.find((m) => m.subtype === 'thumbnail') ?? multimedia[0])?.url
    return safeImageUrl(url && (url.startsWith('http') ? url : IMAGE_HOST + url))
  }
  return safeImageUrl(multimedia.default?.url)
}

const toArticle = (doc: NytDoc): Article | undefined => {
  const url = safeUrl(doc.web_url)
  if (!url) return undefined
  const imageUrl = pickImage(doc.multimedia)
  const author = stripByline(doc.byline?.original)
  return {
    id: `nyt:${doc._id}`,
    provider: 'nyt',
    title: doc.headline.main,
    summary: doc.abstract || doc.snippet || '',
    url,
    ...(imageUrl && { imageUrl }),
    publisher: 'The New York Times',
    ...(doc.section_name && { section: doc.section_name }),
    ...(author && { author }),
    publishedAt: doc.pub_date,
  }
}

// what the reader typed, plus category words and quoted author names
const buildQuery = ({ query, categories, authors }: SearchParams): string | undefined => {
  const terms = mapCategories(categories, CATEGORY_TERMS)
  return [query, terms.join(' '), quotedList(authors, ' ')].filter(Boolean).join(' ') || undefined
}

const compactDate = (date?: string) => date?.replaceAll('-', '')

export const createNytProvider = (apiKey: string): NewsProvider => ({
  id: 'nyt',
  name: 'New York Times',
  search: async (params, page, signal) => {
    const pageIndex = page - 1 // NYT pages start at 0
    const { response } = await fetchJson<NytResponse>(
      buildUrl(ENDPOINT, {
        'api-key': apiKey,
        q: buildQuery(params),
        begin_date: compactDate(params.from),
        end_date: compactDate(params.to),
        sort: params.query ? 'relevance' : 'newest',
        page: pageIndex,
      }),
      { signal },
    )
    const hits = response.metadata?.hits ?? 0
    return {
      articles: (response.docs ?? []).map(toArticle).filter((a): a is Article => a !== undefined),
      hasMore: (pageIndex + 1) * PAGE_SIZE < hits && page < MAX_PAGES,
    }
  },
})
