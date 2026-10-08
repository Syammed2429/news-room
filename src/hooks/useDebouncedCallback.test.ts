import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedCallback } from './useDebouncedCallback'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useDebouncedCallback', () => {
  it('calls once, with the latest arguments, after the delay', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current.run('a')
      vi.advanceTimersByTime(200)
      result.current.run('ab')
      vi.advanceTimersByTime(200)
      result.current.run('abc')
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(500))
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('abc')
  })

  it('can be cancelled', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current.run('a')
      result.current.cancel()
      vi.advanceTimersByTime(1000)
    })
    expect(callback).not.toHaveBeenCalled()
  })
})
