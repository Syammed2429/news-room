import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openHome } from './helpers'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const scan = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  // a readable summary if this ever fails
  return violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme })

    test('the home page has no accessibility violations', async ({ page }) => {
      await openHome(page)
      expect(await scan(page)).toEqual([])
    })

    test('the Personalize sheet has none either', async ({ page }) => {
      await openHome(page)
      await page.getByRole('button', { name: /^Personalize/ }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      // let the slide-in finish, or half-faded text would fail the contrast check
      await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1')
      expect(await scan(page)).toEqual([])
    })

    test('the empty Saved page has none', async ({ page }) => {
      await page.goto('/?view=saved')
      await expect(page.getByText('Nothing saved yet')).toBeVisible()
      expect(await scan(page)).toEqual([])
    })
  })
}
