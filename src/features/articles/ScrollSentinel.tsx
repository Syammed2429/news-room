interface Props {
  onReach: () => void
  // off while a page is loading
  disabled?: boolean
}

// Start loading well before the bottom: about four rows of cards, so the next page has a few
// seconds to arrive while the reader is still looking at the current one.
const LOOKAHEAD = '2000px'

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
