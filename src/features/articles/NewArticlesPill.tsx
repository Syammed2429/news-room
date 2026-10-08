import { ArrowUpIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'

interface Props {
  count: number
  onShow: () => void
}

// Floats at the top of the screen, so it is seen however far down the reader has scrolled.
// It slides in, but leaves at once: there is nothing to animate once the list has refreshed.
export const NewArticlesPill = ({ count, onShow }: Props) => (
  <div role="status" aria-live="polite">
    {count > 0 && (
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-20 left-1/2 z-30 -translate-x-1/2"
      >
        <Button className="rounded-full shadow-lg" onClick={onShow}>
          <ArrowUpIcon />
          {count} new {count === 1 ? 'article' : 'articles'}
        </Button>
      </motion.div>
    )}
  </div>
)
