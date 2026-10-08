import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { openHome } from './helpers'

// runs only in the "mobile" project (a Pixel 7 sized screen)
test.describe('on a phone', () => {
  test('fits the screen without sideways scrolling', async ({ page }) => {
    await openHome(page)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('shows one column and puts the filters in a sheet', async ({ page }) => {
    await openHome(page)
    const columns = await page.locator('ul.grid').first().evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(1)

    await expect(page.getByRole('complementary', { name: 'Filters' })).toBeHidden()
    await page.getByRole('button', { name: 'Filters' }).click()
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
  })

  test('has tap targets big enough to hit', async ({ page }) => {
    await openHome(page)
    // WCAG 2.2: at least 24 by 24 px, or enough space around it
    const { violations } = await new AxeBuilder({ page }).withRules(['target-size']).analyze()
    expect(violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([])
  })
})
