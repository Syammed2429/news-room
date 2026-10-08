import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PrefetchOnScroll } from './PrefetchOnScroll'

const stubObserver = () => {
  const disconnect = vi.fn()
  const created = vi.fn()
  let report: (isIntersecting: boolean) => void = () => {}

  class FakeObserver {
    constructor(callback: IntersectionObserverCallback) {
      created()
      report = (isIntersecting) =>
        callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
    }
    observe() {}
    disconnect = disconnect
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  return { disconnect, created, report: (value: boolean) => report(value) }
}

afterEach(() => vi.unstubAllGlobals())

describe('PrefetchOnScroll', () => {
  it('does nothing while the top of the list is still on screen', () => {
    const observer = stubObserver()
    const onScrolled = vi.fn()
    render(<PrefetchOnScroll onScrolled={onScrolled} />)

    observer.report(true)

    expect(onScrolled).not.toHaveBeenCalled()
  })

  it('asks for the next page once the reader scrolls the top out of view', () => {
    const observer = stubObserver()
    const onScrolled = vi.fn()
    render(<PrefetchOnScroll onScrolled={onScrolled} />)

    observer.report(false)

    expect(onScrolled).toHaveBeenCalledTimes(1)
  })

  it('does not even watch when disabled, such as once page 2 is already loaded', () => {
    const observer = stubObserver()
    render(<PrefetchOnScroll onScrolled={vi.fn()} disabled />)
    expect(observer.created).not.toHaveBeenCalled()
  })

  it('stops watching when it goes away', () => {
    const observer = stubObserver()
    const { unmount } = render(<PrefetchOnScroll onScrolled={vi.fn()} />)
    unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  })
})
