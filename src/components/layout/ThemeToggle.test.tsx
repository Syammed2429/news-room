import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

beforeEach(() => {
  document.documentElement.classList.remove('dark')
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('ThemeToggle', () => {
  it('switches to dark and remembers it, then back again', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /toggle dark mode/i })

    await user.click(button)
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('news-theme')).toBe('dark')

    await user.click(button)
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('news-theme')).toBe('light')
  })

  it('still switches when storage is unavailable, such as in private mode', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const user = userEvent.setup()
    render(<ThemeToggle />)

    await user.click(screen.getByRole('button', { name: /toggle dark mode/i }))

    expect(document.documentElement).toHaveClass('dark')
  })
})
