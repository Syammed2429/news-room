import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScrollSentinel } from './ScrollSentinel'

const stubObserver = () => {
  const disconnect = vi.fn()
  let trigger: (isIntersecting: boolean) => void = () => {}
  const created = vi.fn()

  class FakeObserver {
    constructor(callback: IntersectionObserverCallback) {
      created()
      trigger = (isIntersecting) =>
        callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
    }
    observe() {}
    disconnect = disconnect
  }
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  return { disconnect, created, fire: (value: boolean) => trigger(value) }
}

afterEach(() => vi.unstubAllGlobals())

describe('ScrollSentinel', () => {
  it('calls onReach when it scrolls into view, but not while out of view', () => {
    const observer = stubObserver()
    const onReach = vi.fn()
    render(<ScrollSentinel onReach={onReach} />)

    observer.fire(false)
    expect(onReach).not.toHaveBeenCalled()

    observer.fire(true)
    expect(onReach).toHaveBeenCalledTimes(1)
  })

  it('does not observe while disabled (a page is already loading)', () => {
    const observer = stubObserver()
    render(<ScrollSentinel onReach={vi.fn()} disabled />)
    expect(observer.created).not.toHaveBeenCalled()
  })

  it('disconnects its observer on unmount', () => {
    const observer = stubObserver()
    const { unmount } = render(<ScrollSentinel onReach={vi.fn()} />)
    unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  })
})
