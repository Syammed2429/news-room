// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '../..')
const html = readFileSync(path.join(root, 'index.html'), 'utf8')

// every local file the page points at has to actually exist, or the build ships a broken link
const localFiles = [...html.matchAll(/(?:href|src)="(\/[^"]+)"/g)]
  .map((match) => match[1] ?? '')
  .filter((file) => !file.startsWith('/src/'))

describe('index.html', () => {
  it.each(localFiles)('%s exists in public/', (file) => {
    expect(existsSync(path.join(root, 'public', file))).toBe(true)
  })

  it('describes the page for search and for shared links', () => {
    expect(html).toContain('<title>Newsroom</title>')
    expect(html).toMatch(/<meta name="description"/)
    expect(html).toMatch(/<meta property="og:title"/)
    expect(html).toMatch(/<meta property="og:description"/)
    expect(html).toMatch(/<meta name="twitter:card"/)
  })

  it('has icons for browsers and for home screens', () => {
    expect(html).toMatch(/rel="icon"/)
    expect(html).toMatch(/rel="apple-touch-icon"/)
    expect(html).toMatch(/rel="manifest"/)
  })

  it('sets the browser colour for both themes', () => {
    expect(html).toMatch(/theme-color" content="#ffffff" media="\(prefers-color-scheme: light\)"/)
    expect(html).toMatch(/theme-color" content="#141414" media="\(prefers-color-scheme: dark\)"/)
  })

  it('contains no inline script, which the Content-Security-Policy would block', () => {
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/)
  })
})

describe('web app manifest', () => {
  const manifest = JSON.parse(readFileSync(path.join(root, 'public/manifest.webmanifest'), 'utf8')) as {
    name: string
    start_url: string
    icons: { src: string; sizes: string }[]
  }

  it('has a name and a start page', () => {
    expect(manifest.name).toBe('Newsroom')
    expect(manifest.start_url).toBe('/')
  })

  it('lists icons that exist, including the two sizes installable apps need', () => {
    for (const icon of manifest.icons) expect(existsSync(path.join(root, 'public', icon.src))).toBe(true)
    const sizes = manifest.icons.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })
})
