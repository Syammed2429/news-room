interface Props {
  onReach: () => void
  // off while a page is loading
  disabled?: boolean
}

// start loading a bit before the bottom is reached
const LOOKAHEAD = '600px'

export const ScrollSentinel = ({ onReach, disabled = false }: Props) => {
  return (
    <div
      aria-hidden
      ref={(node) => {
        if (!node || disabled) return
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) onReach()
          },
          { rootMargin: LOOKAHEAD },
        )
        observer.observe(node)
        return () => observer.disconnect()
      }}
    />
  )
}
