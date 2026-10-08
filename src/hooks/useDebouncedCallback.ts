import { useRef } from 'react'

// Calls the callback once the caller has stopped calling run() for delayMs.
export const useDebouncedCallback = <Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
) => {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const cancel = () => clearTimeout(timer.current)
  const run = (...args: Args) => {
    cancel()
    timer.current = setTimeout(() => callback(...args), delayMs)
  }

  return { run, cancel }
}
