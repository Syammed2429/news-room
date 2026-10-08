import { expect, test } from '@playwright/test'
import { cards, openHome } from './helpers'

test.describe('saved articles', () => {
  test('saves an article, keeps it across a reload, and lets you remove it', async ({ page }) => {
    await openHome(page)
    const first = cards(page).first()
    const title = (await first.getByRole('heading', { level: 2 }).textContent())?.replace(/\(opens in a new tab\)/, '').trim() ?? ''

    await first.getByRole('button', { name: /^Save for later/ }).click()
    await expect(page.getByRole('tab', { name: /Saved\s*1/ })).toBeVisible()

    await page.reload()
    await page.getByRole('tab', { name: /Saved/ }).click()
    await expect(page).toHaveURL(/view=saved/)
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText(title)

    await cards(page).first().getByRole('button', { name: /^Remove from saved/ }).click()
    await expect(page.getByText('Nothing saved yet')).toBeVisible()
  })

  test('opens straight onto the Saved tab from its link', async ({ page }) => {
    await page.goto('/?view=saved')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Saved articles')
    await expect(page.getByRole('tab', { name: /Saved/ })).toHaveAttribute('aria-selected', 'true')
  })
})
