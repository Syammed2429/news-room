import { expect, test, type Page } from '@playwright/test'
import { cards, everyCardMentions, openHome } from './helpers'

const trigger = (page: Page) => page.getByRole('button', { name: /^Personalize/ })

test.describe('the Personalize sheet', () => {
  // Tab used to be able to reach the page behind the sheet. Regular Chrome mostly kept focus in
  // anyway, but other browsers and screen readers did not, so the next test is the one that
  // pins the real guarantee: the page behind is marked inert.
  test('keeps keyboard focus inside while open, and gives it back when closed', async ({ page }) => {
    await openHome(page)
    await trigger(page).click()
    const dialog = page.getByRole('dialog', { name: 'Personalize your feed' })
    await expect(dialog).toBeVisible()

    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      // The page behind the sheet must never receive focus. (Base UI's own focus guards sit
      // outside the sheet for an instant and hand focus straight back, which is fine.)
      const onPageBehind = await page.evaluate(() => Boolean(document.querySelector('#root')?.contains(document.activeElement)))
      expect(onPageBehind, `focus reached the page behind the sheet on Tab press ${i + 1}`).toBe(false)
    }
    // and it ends up back inside the sheet
    await expect.poll(() => page.evaluate(() => Boolean(document.querySelector('[role=dialog]')?.contains(document.activeElement)))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger(page)).toBeFocused()
  })

  test('makes the page behind it unreachable while open', async ({ page }) => {
    await openHome(page)
    await trigger(page).click()
    await expect(page.locator('#root')).toHaveAttribute('inert', '')

    await page.keyboard.press('Escape')
    await expect(page.locator('#root')).not.toHaveAttribute('inert', '')
  })

  test('asks before resetting everything', async ({ page }) => {
    await openHome(page)
    await trigger(page).click()
    await page.getByRole('button', { name: 'Science' }).click()

    await page.getByRole('button', { name: 'Reset preferences' }).click()
    await expect(page.getByRole('button', { name: 'Yes, reset everything' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'true')
  })
})

test.describe('the For you feed', () => {
  test('shows only the authors you follow, and remembers them after a reload', async ({ page }) => {
    await openHome(page)
    const follow = page.getByTitle(/^Follow /).first()
    const author = (await follow.textContent())?.trim() ?? ''
    expect(author).not.toBe('')
    await follow.click()

    await page.getByRole('tab', { name: 'For you' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your news feed')
    await expect(cards(page).first()).toBeVisible()
    await everyCardMentions(page, author)

    await page.reload()
    await page.getByRole('tab', { name: 'For you' }).click()
    await expect(cards(page).first()).toContainText(author)
  })

  test('asks you to personalise when there is nothing to build a feed from', async ({ page }) => {
    await openHome(page)
    await page.getByRole('tab', { name: 'For you' }).click()
    await expect(page.getByText('Your feed is empty')).toBeVisible()
  })
})
