interface Props {
  // called once the reader has scrolled past the marker
  onScrolled: () => void
  disabled?: boolean
}

// An invisible marker at the top of the list. The first time the reader scrolls it out of view,
// the next page starts loading, so it is usually ready before they get anywhere near the bottom.
export const PrefetchOnScroll = ({ onScrolled, disabled = false }: Props) => (
  <div
    aria-hidden
    className="h-px"
    ref={(node) => {
      if (!node || disabled) return
      const observer = new IntersectionObserver(([entry]) => {
        if (entry && !entry.isIntersecting) onScrolled()
      })
      observer.observe(node)
      return () => observer.disconnect()
    }}
  />
)
