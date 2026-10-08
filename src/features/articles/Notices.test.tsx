import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EndNote } from './Notices'

describe('EndNote', () => {
  it('says the reader is caught up when that is true', () => {
    render(<EndNote capped={false} failed={false} />)
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })

  it('does not claim that at the page limit', () => {
    render(<EndNote capped failed={false} />)
    expect(screen.getByText(/as far back as we load/i)).toBeInTheDocument()
    expect(screen.queryByText(/all caught up/i)).not.toBeInTheDocument()
  })

  it('warns instead when a source could not be reached', () => {
    render(<EndNote capped failed />)
    expect(screen.getByText(/may not be everything/i)).toBeInTheDocument()
  })
})
