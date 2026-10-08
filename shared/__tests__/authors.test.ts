import { describe, expect, it } from 'vitest'
import { matchesAuthor } from '../authors'

describe('matchesAuthor', () => {
  it('matches a name inside a longer byline, ignoring case', () => {
    expect(matchesAuthor('Jane Doe and John Roe', ['john roe'])).toBe(true)
    expect(matchesAuthor('Carolyn Y. Johnson', ['Carolyn Y. Johnson'])).toBe(true)
  })

  it('is false for other people, missing bylines and no names', () => {
    expect(matchesAuthor('Someone Else', ['Jane Doe'])).toBe(false)
    expect(matchesAuthor(undefined, ['Jane Doe'])).toBe(false)
    expect(matchesAuthor('Jane Doe', [])).toBe(false)
  })
})
