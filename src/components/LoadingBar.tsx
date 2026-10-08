import { useIsFetching } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'

// A thin bar that runs while articles are loading. Old results stay on screen during a
// filter change, so without this it can look like nothing happened.
export const LoadingBar = () => {
  const loading = useIsFetching({ queryKey: ['articles'] }) > 0
  const reduceMotion = useReducedMotion()

  return (
    <div className="h-0.5 overflow-hidden">
      {/* always present, so screen readers hear the change */}
      <span role="status" className="sr-only">
        {loading ? 'Loading articles' : ''}
      </span>
      {loading &&
        (reduceMotion ? (
          <div className="h-full w-full bg-primary/60" />
        ) : (
          <motion.div
            className="h-full w-1/3 rounded-full bg-primary"
            initial={{ x: '-100%' }}
            animate={{ x: '300%' }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
    </div>
  )
}
