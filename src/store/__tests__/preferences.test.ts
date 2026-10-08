import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_AUTHORS } from '@shared/schemas'
import { usePreferencesStore } from '../preferences'

const KEY = 'news-preferences'

const store = () => usePreferencesStore.getState()

beforeEach(() => {
  localStorage.clear()
  usePreferencesStore.setState({ providerIds: [], categories: [], authors: [] })
})

describe('preferences store', () => {
  it('restores saved preferences', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ state: { providerIds: ['nyt'], categories: ['science'], authors: ['Jane Doe'] }, version: 1 }),
    )
    await usePreferencesStore.persist.rehydrate()
    expect(store()).toMatchObject({ providerIds: ['nyt'], categories: ['science'], authors: ['Jane Doe'] })
  })

  it.each([
    ['not json', '{oops'],
    ['wrong shape', JSON.stringify({ state: { authors: 'Jane' }, version: 1 })],
    ['unknown category', JSON.stringify({ state: { providerIds: [], categories: ['gossip'], authors: [] }, version: 1 })],
    ['too many authors', JSON.stringify({ state: { providerIds: [], categories: [], authors: Array(50).fill('A') }, version: 1 })],
  ])('starts clean when storage holds %s', async (_name, raw) => {
    localStorage.setItem(KEY, raw)
    await usePreferencesStore.persist.rehydrate()
    expect(store()).toMatchObject({ providerIds: [], categories: [], authors: [] })
  })

  it('stops following authors at the limit the API accepts', () => {
    for (let i = 0; i < MAX_AUTHORS + 3; i++) store().toggleAuthor(`Author ${i}`)
    expect(store().authors).toHaveLength(MAX_AUTHORS)

    store().toggleAuthor('Author 0') // unfollowing still works at the limit
    expect(store().authors).toHaveLength(MAX_AUTHORS - 1)
  })
})
