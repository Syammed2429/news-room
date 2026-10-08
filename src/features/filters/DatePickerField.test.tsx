import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePickerField } from './DatePickerField'

describe('DatePickerField', () => {
  it('shows a placeholder until a date is chosen', () => {
    render(<DatePickerField label="From" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /from/i })).toHaveTextContent('Any date')
  })

  it('shows a chosen date in a readable form', () => {
    render(<DatePickerField label="From" value="2025-03-07" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /from/i })).toHaveTextContent('07 Mar 2025')
  })

  it('opens a calendar, and picking a day reports it as yyyy-MM-dd', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField label="From" value="2025-03-07" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /from/i }))
    await user.click(await screen.findByRole('button', { name: /March 12th, 2025/ }))

    expect(onChange).toHaveBeenCalledWith('2025-03-12')
  })

  it('can clear a chosen date', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePickerField label="From" value="2025-03-07" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /from/i }))
    await user.click(await screen.findByRole('button', { name: /clear date/i }))

    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it('does not offer dates the caller has blocked', async () => {
    const user = userEvent.setup()
    render(<DatePickerField label="To" value="2025-03-07" onChange={vi.fn()} disabled={(date) => date.getDate() > 20} />)

    await user.click(screen.getByRole('button', { name: /to/i }))

    expect(await screen.findByRole('button', { name: /March 21st, 2025/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /March 12th, 2025/ })).toBeEnabled()
  })
})
