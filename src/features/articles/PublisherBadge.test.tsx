import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PublisherBadge } from './PublisherBadge'

describe('PublisherBadge', () => {
  it.each([
    ['The Guardian', '052962'],
    ['The New York Times', '000000'],
    ['CNN', 'CC0000'],
    ['Axios', '5A29E4'],
  ])('draws the bundled logo for %s', (publisher, hex) => {
    const { container } = render(<PublisherBadge publisher={publisher} url="https://example.com/a" />)
    expect(container.querySelector('svg')).toHaveAttribute('fill', `#${hex}`)
    expect(container.querySelector('img')).toBeNull()
  })

  it('matches on the publisher name, not the exact text', () => {
    const { container } = render(<PublisherBadge publisher="CNN International" url="https://example.com/a" />)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it("uses the publisher's own favicon when there is no bundled logo", () => {
    const { container } = render(<PublisherBadge publisher="BBC News" url="https://www.bbc.com/news/x" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://www.bbc.com/favicon.ico')
  })

  it('falls back to a letter when the favicon fails to load', () => {
    const { container } = render(<PublisherBadge publisher="Formula 1" url="https://www.formula1.com/x" />)
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    if (img) fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()
    expect(container).toHaveTextContent('F')
  })

  it('does not request a favicon over plain http or for a broken url', () => {
    const http = render(<PublisherBadge publisher="Local Paper" url="http://paper.example/a" />)
    expect(http.container.querySelector('img')).toBeNull()
    expect(http.container).toHaveTextContent('L')

    const broken = render(<PublisherBadge publisher="Odd Source" url="not a url" />)
    expect(broken.container.querySelector('img')).toBeNull()
    expect(broken.container).toHaveTextContent('O')
  })

  it('skips a leading "The" when picking the letter', () => {
    // http, so there is no favicon and the letter is what shows
    const { container } = render(<PublisherBadge publisher="The Washington Post" url="http://wp.example/a" />)
    expect(container).toHaveTextContent('W')
  })

  it('hides the visible name next to a wordmark but keeps it for screen readers', () => {
    const { getByText } = render(<PublisherBadge publisher="The Guardian" url="https://www.theguardian.com/a" />)
    expect(getByText('The Guardian')).toHaveClass('sr-only')
  })

  it('shows the name next to a symbol or favicon', () => {
    const { getByText } = render(<PublisherBadge publisher="The New York Times" url="https://www.nytimes.com/a" />)
    expect(getByText('The New York Times')).not.toHaveClass('sr-only')
  })
})
