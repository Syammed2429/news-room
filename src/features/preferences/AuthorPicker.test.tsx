import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MAX_AUTHORS } from '@shared/schemas'
import { AuthorPicker } from './AuthorPicker'

describe('AuthorPicker', () => {
  it('adds a trimmed name', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<AuthorPicker authors={[]} onToggle={onToggle} />)

    await user.type(screen.getByRole('textbox', { name: /add author/i }), '  Jane Doe {enter}')

    expect(onToggle).toHaveBeenCalledWith('Jane Doe')
  })

  it('ignores a blank name and explains why', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<AuthorPicker authors={[]} onToggle={onToggle} />)

    await user.type(screen.getByRole('textbox', { name: /add author/i }), '   {enter}')

    expect(onToggle).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/enter a name/i)
  })

  it('refuses a new author once the limit is reached', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    const authors = Array.from({ length: MAX_AUTHORS }, (_, i) => `Author ${i}`)
    render(<AuthorPicker authors={authors} onToggle={onToggle} />)

    await user.type(screen.getByRole('textbox', { name: /add author/i }), 'One More{enter}')

    expect(onToggle).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/up to 10 authors/i)
  })
})
