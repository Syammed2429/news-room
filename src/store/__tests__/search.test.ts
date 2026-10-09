import { describe, expect, it } from 'vitest'
import { useSearchStore } from '../search'

describe('search store', () => {
  it('drops source ids the server does not have', () => {
    useSearchStore.setState({ providerIds: ['guardian', 'evil'] })
    useSearchStore.getState().keepProviders(['guardian', 'nyt'])
    expect(useSearchStore.getState().providerIds).toEqual(['guardian'])
  })

  it('keeps the same list when every source is known', () => {
    const providerIds = ['nyt']
    useSearchStore.setState({ providerIds })
    useSearchStore.getState().keepProviders(['nyt'])
    expect(useSearchStore.getState().providerIds).toBe(providerIds)
  })
})
