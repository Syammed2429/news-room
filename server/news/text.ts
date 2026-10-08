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
