import { expect, test, type Page } from '@playwright/test'
import { cards, category, openHome, searchBox } from './helpers'

const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Filters' })
const search = (page: Page) => new URL(page.url()).search

test.describe('filters', () => {
  test('a source limits the list, and unchecking the last one brings every source back', async ({ page }) => {
    await openHome(page)
    await sidebar(page).getByRole('checkbox', { name: 'Demo Wire' }).check()
    await expect(page).toHaveURL(/sources=demo-wire$/)
    await expect.poll(async () => (await cards(page).allTextContents()).every((t) => t.includes('Demo Wire'))).toBe(true)

    await page.getByRole('button', { name: 'Remove filter: Demo Wire' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('list', { name: 'Active filters' })).toBeHidden()
  })

  test('category, source and keyword apply together, and clearing the search keeps the filters', async ({ page }) => {
    await openHome(page)
    await category(page, 'Science').click()
    await sidebar(page).getByRole('checkbox', { name: 'Demo Daily' }).check()
    await searchBox(page).fill('battery')

    await expect(page).toHaveURL(/q=battery/)
    await expect
      .poll(async () => {
        const all = await cards(page).allTextContents()
        return all.length > 0 && all.every((t) => /battery/i.test(t) && t.includes('Science') && t.includes('Demo Daily'))
      })
      .toBe(true)

    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(page).not.toHaveURL(/q=/)
    expect(search(page)).toContain('category=science')
    expect(search(page)).toContain('sources=demo-daily')
  })

  test('quickly switching categories ends on the last one, with no stale cards', async ({ page }) => {
    await openHome(page)
    await category(page, 'Science').click()
    await category(page, 'Health').click()
    await category(page, 'Business').click()
    await expect(page).toHaveURL(/category=business$/)
    await expect
      .poll(async () => {
        const all = await cards(page).allTextContents()
        return all.length > 0 && all.every((t) => t.includes('Business'))
      })
      .toBe(true)
  })

  test('Back steps through filter changes one at a time', async ({ page }) => {
    await openHome(page)
    await category(page, 'Science').click()
    await category(page, 'Health').click()
    await expect(page).toHaveURL(/category=health$/)
    await page.goBack()
    await expect(page).toHaveURL(/category=science$/)
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
  })

  test('a date window only shows articles inside it, and an empty window says so', async ({ page }) => {
    await openHome(page, '/?from=2026-10-03&to=2026-10-07')
    const days = await cards(page).evaluateAll((els) => els.map((e) => e.querySelector('time')?.getAttribute('datetime')?.slice(0, 10) ?? ''))
    expect(days.length).toBeGreaterThan(0)
    expect(days.every((day) => day >= '2026-10-03' && day <= '2026-10-07')).toBe(true)

    await page.goto('/?from=2001-01-01&to=2001-01-05')
    await expect(page.getByText('No articles found')).toBeVisible()
  })

  test('the date buttons are announced with their value', async ({ page }) => {
    await openHome(page, '/?from=2026-09-01')
    await expect(sidebar(page).getByRole('button', { name: 'From 01 Sep 2026' })).toBeVisible()
    await expect(sidebar(page).getByRole('button', { name: 'To Any date' })).toBeVisible()
  })

  test('For you: only the preferred categories and sources are offered, and picking one narrows the feed', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'news-preferences',
        JSON.stringify({
          state: { providerIds: ['demo-wire', 'demo-times'], categories: ['science', 'health'], authors: [] },
          version: 1,
        }),
      ),
    )
    await openHome(page, '/?view=feed')

    const chips = page.getByRole('navigation', { name: 'Categories' }).getByRole('button')
    await expect(chips).toHaveText(['All', 'Science', 'Health'])
    await expect(sidebar(page).getByRole('checkbox')).toHaveCount(2)
    await expect(sidebar(page).getByRole('checkbox', { name: 'Demo Daily' })).toHaveCount(0)

    await category(page, 'Health').click()
    await sidebar(page).getByRole('checkbox', { name: 'Demo Times' }).check()
    await expect
      .poll(async () => {
        const all = await cards(page).allTextContents()
        return all.length > 0 && all.every((t) => t.includes('Health') && t.includes('Demo Times'))
      })
      .toBe(true)
  })

  test('Saved: search, source and date filter the saved list on this device', async ({ page }) => {
    await openHome(page)
    const titles: string[] = []
    for (const index of [0, 1]) {
      const card = cards(page).nth(index)
      titles.push(((await card.getByRole('heading', { level: 2 }).textContent()) ?? '').replace(/\(opens in a new tab\)/, '').trim())
      await card.getByRole('button', { name: /^Save for later/ }).click()
    }
    await page.getByRole('tab', { name: /Saved/ }).click()
    await expect(cards(page)).toHaveCount(2)

    await searchBox(page).fill(titles[0] ?? '')
    await expect(cards(page)).toHaveCount(1)
    await expect(page.getByText(/1 of 2 saved articles/)).toBeVisible()

    await sidebar(page).getByRole('checkbox', { name: 'Demo Daily' }).check()
    await expect(page.getByText('No articles found')).toBeVisible()
    await page.getByRole('button', { name: 'Clear search and filters' }).click()
    await expect(cards(page)).toHaveCount(2)
  })
})
