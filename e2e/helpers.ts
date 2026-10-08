import { expect, type Page } from '@playwright/test'

export const cards = (page: Page) => page.getByRole('article')

export const searchBox = (page: Page) => page.getByRole('textbox', { name: 'Search articles' })

export const category = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name })

// Cards fade in one after another, so wait until all of them are fully opaque. That also makes
// colour-contrast checks fair, since half-faded text would fail them.
export const openHome = async (page: Page, path = '/') => {
  await page.goto(path)
  await expect(cards(page).first()).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('article')].every((card) => getComputedStyle(card).opacity === '1'),
      ),
    )
    .toBe(true)
}

// True once there are cards and every one of them mentions the text. Polls, because the list is
// replaced when a filter changes and a one-off read could catch it half way.
export const everyCardMentions = (page: Page, text: string) =>
  expect
    .poll(async () => {
      const all = await cards(page).allTextContents()
      return all.length > 0 && all.every((card) => card.includes(text))
    })
    .toBe(true)
