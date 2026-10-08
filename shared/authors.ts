// True when the byline contains any of the names, ignoring case.
// Bylines are free text ("Jane Doe and John Roe"), so this is a substring match.
export const matchesAuthor = (byline: string | undefined, names: readonly string[]): boolean => {
  const text = (byline ?? '').toLowerCase()
  return names.some((name) => text.includes(name.toLowerCase()))
}
