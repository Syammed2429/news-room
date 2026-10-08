import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingBar } from './LoadingBar'

const setup = () => {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <LoadingBar />
    </QueryClientProvider>,
  )
  return client
}

describe('LoadingBar', () => {
  it('says nothing while idle', () => {
    setup()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('announces loading while an articles query is in flight, then goes quiet', async () => {
    const client = setup()
    let finish: (value: string) => void = () => {}
    const pending = new Promise<string>((resolve) => {
      finish = resolve
    })

    act(() => {
      void client.fetchQuery({ queryKey: ['articles', 'x'], queryFn: () => pending })
    })
    expect(await screen.findByText('Loading articles')).toBeInTheDocument()

    await act(async () => finish('done'))
    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement())
  })

  it('ignores other queries, like the source list', () => {
    const client = setup()
    act(() => {
      void client.fetchQuery({ queryKey: ['sources'], queryFn: () => new Promise<string>(() => {}) })
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
