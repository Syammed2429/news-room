import { formatDistanceToNow } from 'date-fns'
import { HeartIcon, ImageOffIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { splitAuthors } from '@/lib/text'
import { usePreferencesStore } from '@/store/preferences'
import { PublisherBadge } from './PublisherBadge'
import { authorNameSchema, MAX_AUTHORS } from '@shared/schemas'
import type { Article } from '@shared/news'

interface Props {
  article: Article
  // "lead" is the big top story card
  variant?: 'default' | 'lead'
  // used to stagger the fade-in
  index: number
}

const timeAgo = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true })
}

const ArticleImage = ({ src, alt, lead }: { src?: string | undefined; alt: string; lead: boolean }) => {
  const [failed, setFailed] = useState(false)
  const showImage = src && !failed

  return (
    <div className={cn('aspect-video overflow-hidden bg-muted', lead && 'md:aspect-auto md:w-3/5')}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          // stops image hosts seeing which page we're on
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-linear-to-br from-primary/15 to-muted text-muted-foreground">
          <ImageOffIcon aria-hidden className="size-6" />
        </div>
      )}
    </div>
  )
}

const AuthorFollowButtons = ({ byline }: { byline: string }) => {
  const followed = usePreferencesStore((s) => s.authors)
  const toggleAuthor = usePreferencesStore((s) => s.toggleAuthor)

  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      {splitAuthors(byline).map((name) => {
        const isFollowed = followed.includes(name)
        // the API won't accept names this long, so show them as plain text
        if (!authorNameSchema.safeParse(name).success) return <span key={name} className="text-xs">{name}</span>
        const limitReached = !isFollowed && followed.length >= MAX_AUTHORS
        return (
          <button
            key={name}
            type="button"
            onClick={() => toggleAuthor(name)}
            aria-pressed={isFollowed}
            disabled={limitReached}
            title={limitReached ? `You can follow up to ${MAX_AUTHORS} authors` : isFollowed ? `Unfollow ${name}` : `Follow ${name}`}
            className={cn(
              'relative z-10 inline-flex items-center gap-1 rounded text-xs font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline',
              isFollowed ? 'text-primary' : 'text-foreground/80',
            )}
          >
            <HeartIcon aria-hidden className={cn('size-3', isFollowed && 'fill-current')} />
            {name}
          </button>
        )
      })}
    </span>
  )
}

export const ArticleCard = ({ article, index, variant = 'default' }: Props) => {
  const lead = variant === 'lead'
  const { title, summary, url, imageUrl, publisher, section, author, publishedAt } = article

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 9) * 0.04 }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md',
        lead && 'md:flex-row',
      )}
    >
      <ArticleImage src={imageUrl} alt="" lead={lead} />
      <div className={cn('flex flex-1 flex-col gap-2 p-4', lead && 'md:justify-center md:gap-3 md:p-8')}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <PublisherBadge publisher={publisher} url={url} />
          {section && <Badge variant="secondary">{section}</Badge>}
          {lead && <Badge>Top story</Badge>}
        </div>
        <h2
          className={cn(
            'leading-snug font-semibold text-balance',
            lead ? 'text-xl md:text-3xl md:leading-tight' : 'text-base',
          )}
        >
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-ring/50 focus-visible:after:rounded-xl"
          >
            {title}
          </a>
        </h2>
        {summary && (
          <p className={cn('text-sm text-muted-foreground', lead ? 'line-clamp-4 md:text-base' : 'line-clamp-3')}>
            {summary}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-1 pt-3">
          {author && <AuthorFollowButtons byline={author} />}
          <time dateTime={publishedAt} className="text-xs text-muted-foreground">
            {timeAgo(publishedAt)}
          </time>
        </div>
      </div>
    </motion.article>
  )
}
