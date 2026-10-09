import { describe, expect, it } from 'vitest'
import { htmlToText, quoted, safeImageUrl, safeUrl, searchText, stripByline } from '../text'

describe('htmlToText', () => {
  it('strips tags and decodes entities', () => {
    expect(htmlToText('<p>Fish &amp; <strong>chips</strong></p>')).toBe('Fish & chips')
  })

  it('handles missing input', () => {
    expect(htmlToText(undefined)).toBe('')
    expect(htmlToText(null)).toBe('')
  })

  it('never leaves markup behind for the client to render', () => {
    expect(htmlToText('<img src=x onerror=alert(1)>Hello<script>alert(1)</script>')).not.toMatch(/[<>]/)
  })
})

describe('stripByline', () => {
  it('removes the leading "By"', () => {
    expect(stripByline('By Jane Doe')).toBe('Jane Doe')
    expect(stripByline('')).toBeUndefined()
  })
})

describe('safeUrl', () => {
  it('allows http(s) and rejects script-capable schemes', () => {
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(safeUrl('http://example.com/a')).toBe('http://example.com/a')
    expect(safeUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeUrl('data:text/html,<script>1</script>')).toBeUndefined()
    expect(safeUrl('//evil.example')).toBeUndefined()
    expect(safeUrl('not a url')).toBeUndefined()
    expect(safeUrl(null)).toBeUndefined()
  })

  it('requires https for images', () => {
    expect(safeImageUrl('https://cdn.example/a.jpg')).toBe('https://cdn.example/a.jpg')
    expect(safeImageUrl('http://cdn.example/a.jpg')).toBeUndefined()
  })
})

describe('quoted', () => {
  it('stops user text breaking out of a quoted search term', () => {
    expect(quoted('Jane "The Pen" Doe')).toBe('"Jane The Pen Doe"')
  })
})

describe('searchText', () => {
  it('leaves ordinary searches alone', () => {
    expect(searchText('climate change')).toBe('climate change')
    expect(searchText("don't AT&T COVID-19 café 日本")).toBe("don't AT&T COVID-19 café 日本")
  })

  it('keeps paired quotes so exact-phrase search works, and drops a lone one', () => {
    expect(searchText('"climate change"')).toBe('"climate change"')
    expect(searchText('"climate')).toBe('climate')
  })

  it.each([
    ['Trump: tariffs', 'Trump tariffs'],
    ['[a]', 'a'],
    ['(x) {y} \\z ^ ~', 'x y z'],
    ['why? #metoo 50%', 'why metoo 50'],
  ])('drops characters the APIs read as syntax: %s', (input, expected) => {
    expect(searchText(input)).toBe(expected)
  })

  it('is empty when nothing searchable is left', () => {
    expect(searchText('🔥')).toBe('')
    expect(searchText('   ')).toBe('')
    expect(searchText(':[]')).toBe('')
  })
})
