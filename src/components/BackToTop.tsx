import { ArrowUpIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// Watches a marker at the top of the page. Once it scrolls out of view we show the button.
export const BackToTop = () => {
  const [visible, setVisible] = useState(false)

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 h-px w-px"
        ref={(node) => {
          if (!node) return
          const observer = new IntersectionObserver(([entry]) => setVisible(!entry?.isIntersecting), {
            rootMargin: '200px 0px 0px 0px',
          })
          observer.observe(node)
          return () => observer.disconnect()
        }}
      />
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed right-4 bottom-4 z-40"
          >
            <Button
              size="icon-lg"
              className="rounded-full shadow-lg"
              aria-label="Back to top"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <ArrowUpIcon />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
