import { expect, test } from '@playwright/test'
import { cards, category, everyCardMentions, openHome, searchBox } from './helpers'

test.describe('browsing', () => {
  test('shows the latest articles, labelled as sample data', async ({ page }) => {
    await openHome(page)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Latest news')
    expect(await cards(page).count()).toBeGreaterThanOrEqual(10)
    await expect(page.getByText(/showing sample articles/i)).toBeVisible()
  })

  test('searches as you type, and keeps the search in the address', async ({ page }) => {
    await openHome(page)
    await searchBox(page).fill('markets')

    await expect(page).toHaveURL(/[?&]q=markets/)
    await everyCardMentions(page, 'arkets') // "Markets" or "markets"
  })

  test('filters by category, and Back undoes it', async ({ page }) => {
    await openHome(page)
    await category(page, 'Sports').click()

    await expect(page).toHaveURL(/category=sports/)
    await expect(category(page, 'Sports')).toHaveAttribute('aria-pressed', 'true')
    await everyCardMentions(page, 'Sports')

    await page.goBack()
    await expect(page).not.toHaveURL(/category=/)
    await expect(category(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  })

  test('restores everything from a shared link', async ({ page }) => {
    await openHome(page, '/?q=telescope&category=science&sort=relevance&sources=demo-wire')

    await expect(searchBox(page)).toHaveValue('telescope')
    await expect(category(page, 'Science')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('group', { name: 'Sort results' }).getByRole('button', { name: 'Most relevant' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('list', { name: 'Active filters' })).toContainText('Demo Wire')
  })

  test('ignores a broken link instead of crashing', async ({ page }) => {
    await openHome(page, '/?category=gossip&view=admin&from=nope&sort=random')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Latest news')
    await expect(category(page, 'All')).toHaveAttribute('aria-pressed', 'true')
  })

  test('only offers sorting while searching', async ({ page }) => {
    await openHome(page)
    await expect(page.getByRole('group', { name: 'Sort results' })).toHaveCount(0)
    await searchBox(page).fill('markets')
    await expect(page.getByRole('group', { name: 'Sort results' })).toBeVisible()
  })

  test('loads more as you scroll', async ({ page }) => {
    await openHome(page)
    const before = await cards(page).count()

    await page.mouse.wheel(0, 1500)

    await expect.poll(() => cards(page).count()).toBeGreaterThan(before)
  })

  test('offers a recent search again once the box is empty', async ({ page }) => {
    await openHome(page)
    await searchBox(page).fill('markets')
    await searchBox(page).press('Enter')
    await searchBox(page).clear()

    await page.getByRole('group', { name: 'Recent searches' }).getByRole('button', { name: 'markets' }).click()

    await expect(searchBox(page)).toHaveValue('markets')
  })

  test('says so when nothing matches, and the button gets you out', async ({ page }) => {
    await openHome(page)
    await searchBox(page).fill('zzzzqqqq')

    await expect(page.getByText('No articles found')).toBeVisible()
    await page.getByRole('button', { name: 'Clear search and filters' }).click()

    await expect(searchBox(page)).toHaveValue('')
    await expect(cards(page).first()).toBeVisible()
  })

  test('keyboard users can skip straight to the articles', async ({ page }) => {
    await openHome(page)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Skip to articles' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#content$/)
  })
})
