import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CATEGORIES } from '@shared/news'
import { CategoryToggles } from './CategoryToggles'

describe('CategoryToggles', () => {
  it('offers every category and marks the chosen ones as pressed', () => {
    render(<CategoryToggles selected={['science', 'sports']} onToggle={vi.fn()} />)

    expect(screen.getAllByRole('button')).toHaveLength(CATEGORIES.length)
    expect(screen.getByRole('button', { name: 'Science' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Sports' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Health' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports which category was clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<CategoryToggles selected={[]} onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: 'Politics' }))

    expect(onToggle).toHaveBeenCalledWith('politics')
  })
})
