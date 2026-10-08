import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreferencesStore } from '@/store/preferences'
import { PreferencesSheet } from './PreferencesSheet'

const renderSheet = () => {
  vi.stubGlobal('fetch', async () => Response.json({ sources: [{ id: 'a', name: 'Test Wire' }], demo: false }))
  const client = new QueryClient()
  // the sheet marks #root inert while it is open, so give it one like the real page has
  const root = document.createElement('div')
  root.id = 'root'
  document.body.appendChild(root)
  return {
    root,
    ...render(
      <QueryClientProvider client={client}>
        <PreferencesSheet />
      </QueryClientProvider>,
      { container: root },
    ),
  }
}

beforeEach(() => {
  document.getElementById('root')?.remove()
  usePreferencesStore.setState({ providerIds: [], categories: ['science'], authors: ['Jane Doe'] })
})

describe('PreferencesSheet', () => {
  it('asks before wiping the preferences', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: /personalize/i }))

    await user.click(await screen.findByRole('button', { name: /reset preferences/i }))
    // nothing is gone yet
    expect(usePreferencesStore.getState().categories).toEqual(['science'])

    await user.click(screen.getByRole('button', { name: /yes, reset everything/i }))
    expect(usePreferencesStore.getState()).toMatchObject({ providerIds: [], categories: [], authors: [] })
  })

  it('lets the reader back out', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.click(screen.getByRole('button', { name: /personalize/i }))
    await user.click(await screen.findByRole('button', { name: /reset preferences/i }))

    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(usePreferencesStore.getState().authors).toEqual(['Jane Doe'])
    expect(screen.getByRole('button', { name: /reset preferences/i })).toBeInTheDocument()
  })

  it('keeps the page behind the sheet out of reach while it is open', async () => {
    const user = userEvent.setup()
    const { root } = renderSheet()
    expect(root).not.toHaveAttribute('inert')

    await user.click(screen.getByRole('button', { name: /personalize/i }))
    await screen.findByRole('dialog')
    expect(root).toHaveAttribute('inert')

    await user.keyboard('{Escape}')
    expect(root).not.toHaveAttribute('inert')
  })
})
