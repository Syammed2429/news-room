import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

const Bomb = ({ explode }: { explode: boolean }) => {
  if (explode) throw new Error('boom')
  return <p>all fine</p>
}

// React logs caught render errors; keep the test output readable and check we report them
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('ErrorBoundary', () => {
  it('renders its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('all fine')).toBeInTheDocument()
  })

  it('shows a way out instead of a blank page when rendering throws', () => {
    const report = vi.fn()
    vi.stubGlobal('reportError', report)
    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
    expect(screen.getByRole('button', { name: /reload the page/i })).toBeInTheDocument()
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }))
    vi.unstubAllGlobals()
  })
})
