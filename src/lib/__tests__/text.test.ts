import { describe, expect, it } from 'vitest'
import { splitAuthors } from '../text'

describe('splitAuthors', () => {
  it('splits combined bylines into names', () => {
    expect(splitAuthors('Jane Doe and John Roe')).toEqual(['Jane Doe', 'John Roe'])
    expect(splitAuthors('A B, C D & E F')).toEqual(['A B', 'C D', 'E F'])
    expect(splitAuthors(undefined)).toEqual([])
  })

  it('ignores bracketed notes used on live blogs', () => {
    expect(splitAuthors('Jakub Krupa (now and earlier) and Martin Belam (earlier)')).toEqual([
      'Jakub Krupa',
      'Martin Belam',
    ])
    expect(splitAuthors('Taz Ali (now) and Tom Ambrose (earlier')).toEqual(['Taz Ali', 'Tom Ambrose'])
  })
})
