import * as z from 'zod/mini'
import { categorySchema, providerIdSchema, queryTextSchema, sortSchema } from '@shared/schemas'
import { VIEWS, type FeedView } from '@/types/filters'
import type { Category, ProviderId, Sort } from '@shared/news'

// The parts of the app state that live in the address bar, so a link or a refresh restores them.
export interface UrlState {
  view: FeedView
  query: string
  category: Category | null
  providerIds: ProviderId[]
  sort: Sort
  from?: string
  to?: string
}

export const DEFAULT_URL_STATE: UrlState = {
  view: 'latest',
  query: '',
  category: null,
  providerIds: [],
  sort: 'newest',
}

const viewSchema = z.enum(VIEWS)
const dateSchema = z.iso.date()
const MAX_SOURCES = 10

// A URL can be written by anyone, so every piece is checked with the same rules the API uses.
// Anything that doesn't pass is dropped and the default is used instead.
export const parseUrlState = (search: string): Partial<UrlState> => {
  const params = new URLSearchParams(search)
  const state: Partial<UrlState> = {}

  const query = queryTextSchema.safeParse(params.get('q') ?? '')
  if (query.success && query.data) state.query = query.data

  const view = viewSchema.safeParse(params.get('view'))
  if (view.success) state.view = view.data

  const category = categorySchema.safeParse(params.get('category'))
  if (category.success) state.category = category.data

  const sort = sortSchema.safeParse(params.get('sort'))
  if (sort.success) state.sort = sort.data

  const sources = (params.get('sources') ?? '')
    .split(',')
    .flatMap((id) => {
      const parsed = providerIdSchema.safeParse(id)
      return parsed.success ? parsed.data : []
    })
  if (sources.length > 0) state.providerIds = [...new Set(sources)].slice(0, MAX_SOURCES)

  const from = dateSchema.safeParse(params.get('from'))
  const to = dateSchema.safeParse(params.get('to'))
  if (from.success) state.from = from.data
  // a range that ends before it starts makes no sense, so keep only the start
  if (to.success && !(from.success && to.data < from.data)) state.to = to.data

  return state
}

// Only what differs from the defaults goes in the URL, so the plain page keeps a clean address.
export const toSearch = (state: UrlState): string => {
  const params = new URLSearchParams()
  if (state.view !== DEFAULT_URL_STATE.view) params.set('view', state.view)
  if (state.query) params.set('q', state.query)
  if (state.category) params.set('category', state.category)
  if (state.providerIds.length > 0) params.set('sources', state.providerIds.join(','))
  // sort only means something while searching
  if (state.query && state.sort !== DEFAULT_URL_STATE.sort) params.set('sort', state.sort)
  if (state.from) params.set('from', state.from)
  if (state.to) params.set('to', state.to)
  const text = params.toString()
  return text ? `?${text}` : ''
}
