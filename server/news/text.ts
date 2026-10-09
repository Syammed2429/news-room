import { decodeHTML } from 'entities'

// Some APIs send HTML snippets. Strip the tags and decode entities so the client only gets plain text.
export const htmlToText = (html: string | null | undefined): string => {
  if (!html) return ''
  return decodeHTML(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

// "By Jane Doe" -> "Jane Doe"
export const stripByline = (byline: string | null | undefined): string | undefined => {
  const cleaned = byline?.replace(/^by\s+/i, '').trim()
  return cleaned || undefined
}

export const includesIgnoreCase = (haystack: string | undefined, needle: string): boolean =>
  (haystack ?? '').toLowerCase().includes(needle.toLowerCase())

// Only absolute URLs with an allowed scheme get through, so javascript: and data: links
// never reach an href or src.
export const safeUrl = (
  value: string | null | undefined,
  protocols: readonly string[] = ['https:', 'http:'],
): string | undefined => {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return protocols.includes(url.protocol) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export const safeImageUrl = (value: string | null | undefined) => safeUrl(value, ['https:'])

// wraps in quotes and drops quotes inside, so user text can't change the search expression
export const quoted = (value: string): string => `"${value.replaceAll('"', '')}"`

export const quotedList = (values: readonly string[], separator: string): string =>
  values.map(quoted).join(separator)

// People type anything into a search box, but the news APIs read some characters as syntax: a lone
// quote, a colon or square brackets make the Guardian answer 400. Keep letters, digits and a few
// harmless marks. Quotes only stay when they pair up, so searching for an exact phrase still works.
export const searchText = (raw: string): string => {
  const kept = raw.replace(/[^\p{L}\p{N}\s'"&.,-]/gu, ' ')
  const text = (kept.match(/"/g)?.length ?? 0) % 2 === 0 ? kept : kept.replaceAll('"', ' ')
  return text.replace(/\s+/g, ' ').trim()
}

const OPERATORS = new Set(['AND', 'OR', 'NOT'])

// Splits into words and "quoted phrases". Cleaned search text has paired quotes, so this is safe.
const terms = (text: string): string[] => text.match(/"[^"]*"|\S+/g) ?? []

// The Guardian treats a plain "climate change" as climate OR change, which matches almost
// everything. Put AND between the words, but leave AND, OR and NOT the reader typed as they are.
export const allTerms = (text: string): string =>
  terms(text)
    .flatMap((term, index, all) => {
      const previous = all[index - 1]
      const needsAnd = previous !== undefined && !OPERATORS.has(previous) && !OPERATORS.has(term)
      return needsAnd ? ['AND', term] : [term]
    })
    .join(' ')
