// "A and B" or "A, B" -> ["A", "B"]
// Guardian live blogs put notes like "(now)" in the byline, so those go first
export const splitAuthors = (byline: string | undefined): string[] => {
  if (!byline) return []
  return byline
    .replace(/\([^)]*\)?/g, ' ')
    .split(/\s*(?:,|&|\band\b)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean)
}
