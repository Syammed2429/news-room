import * as z from 'zod/mini'
import { CATEGORIES, SORTS } from './news'
import { MAX_PAGE } from './pagination'

// limits live here so the forms and the API agree
export const MAX_QUERY_LENGTH = 100
export const MAX_AUTHOR_LENGTH = 80
export const MAX_AUTHORS = 10
export const MAX_SAVED = 50
const MAX_PROVIDER_ID_LENGTH = 32

export const queryTextSchema = z.string().check(z.trim(), z.maxLength(MAX_QUERY_LENGTH))
export const authorNameSchema = z.string().check(z.trim(), z.minLength(1), z.maxLength(MAX_AUTHOR_LENGTH))
export const categorySchema = z.enum(CATEGORIES)
export const sortSchema = z.enum(SORTS)
export const providerIdSchema = z.string().check(z.minLength(1), z.maxLength(MAX_PROVIDER_ID_LENGTH))

const listOf = <T extends z.ZodMiniType>(item: T, max: number) => z.array(item).check(z.maxLength(max))

const searchParamsSchema = z.strictObject({
  query: queryTextSchema,
  categories: listOf(categorySchema, CATEGORIES.length),
  authors: listOf(authorNameSchema, MAX_AUTHORS),
  sort: z.optional(sortSchema),
  from: z.optional(z.iso.date()),
  to: z.optional(z.iso.date()),
})

// strictObject rejects keys we don't know
export const searchBodySchema = z.strictObject({
  request: z.strictObject({
    queries: z.array(searchParamsSchema).check(z.minLength(1), z.maxLength(2)),
    providerIds: listOf(providerIdSchema, 10),
  }),
  cursor: z.strictObject({
    page: z.int().check(z.gte(1), z.lte(MAX_PAGE)),
    exhausted: listOf(z.string().check(z.maxLength(64)), 40),
  }),
})

export const preferencesSchema = z.object({
  providerIds: listOf(providerIdSchema, 10),
  categories: listOf(categorySchema, CATEGORIES.length),
  authors: listOf(authorNameSchema, MAX_AUTHORS),
})

export type Preferences = z.infer<typeof preferencesSchema>

// A saved article is read back from localStorage, which anyone can edit, so it is checked like
// any other outside data: links must be http(s), images https, and nothing may be huge.
export const articleSchema = z.object({
  id: z.string().check(z.minLength(1), z.maxLength(600)),
  provider: providerIdSchema,
  title: z.string().check(z.maxLength(500)),
  summary: z.string().check(z.maxLength(3000)),
  url: z.httpUrl(),
  imageUrl: z.optional(z.url({ protocol: /^https$/ })),
  publisher: z.string().check(z.maxLength(200)),
  section: z.optional(z.string().check(z.maxLength(200))),
  author: z.optional(z.string().check(z.maxLength(600))),
  publishedAt: z.string().check(z.maxLength(40)),
})
