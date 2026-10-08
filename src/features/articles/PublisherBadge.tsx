import { useState } from 'react'
import { cn } from '@/lib/utils'
import { findPublisherLogo } from './publisherLogos'

interface Props {
  publisher: string
  url: string
}

// the favicon sits at the root of the publisher's own site, so no third party is involved
const faviconUrl = (articleUrl: string): string | undefined => {
  try {
    const url = new URL('/favicon.ico', articleUrl)
    return url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

// "The Washington Post" should show W, not T
const initial = (publisher: string) => publisher.replace(/^the\s+/i, '').charAt(0).toUpperCase()

const round = 'grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-foreground/10 dark:ring-white/15'

const Mark = ({ publisher, url }: Props) => {
  const [faviconFailed, setFaviconFailed] = useState(false)

  const logo = findPublisherLogo(publisher)
  if (logo?.box) {
    return (
      <span aria-hidden className="grid h-6 w-14 shrink-0 place-items-center rounded-md bg-white px-1.5 ring-1 ring-foreground/10 dark:ring-white/15">
        <svg viewBox={logo.box} className="size-full" fill={`#${logo.hex}`}>
          <path d={logo.path} />
        </svg>
      </span>
    )
  }
  if (logo) {
    return (
      <span aria-hidden className={round}>
        <svg viewBox="0 0 24 24" className="size-4" fill={`#${logo.hex}`}>
          <path d={logo.path} />
        </svg>
      </span>
    )
  }

  const favicon = faviconUrl(url)
  if (favicon && !faviconFailed) {
    return (
      <span aria-hidden className={round}>
        <img
          src={favicon}
          alt=""
          width={16}
          height={16}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFaviconFailed(true)}
          className="size-4 object-contain"
        />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
    >
      {initial(publisher)}
    </span>
  )
}

export const PublisherBadge = ({ publisher, url }: Props) => {
  // a wordmark already spells out the name, so the text is only kept for screen readers
  const wordmark = Boolean(findPublisherLogo(publisher)?.box)
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Mark publisher={publisher} url={url} />
      <span className={cn('truncate', wordmark && 'sr-only')}>{publisher}</span>
    </span>
  )
}
