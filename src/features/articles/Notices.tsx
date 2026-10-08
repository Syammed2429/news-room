import { AlertTriangleIcon, InfoIcon, NewspaperIcon, SparklesIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSources } from '@/hooks/useSources'
import type { ProviderFailure } from '@shared/news'

interface BannerProps {
  tone?: 'info' | 'warning'
  children: ReactNode
}

export const Banner = ({ tone = 'info', children }: BannerProps) => {
  const Icon = tone === 'warning' ? AlertTriangleIcon : InfoIcon
  return (
    <div
      role={tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg p-3 text-sm',
        tone === 'warning' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export const FailureBanner = ({ failures }: { failures: ProviderFailure[] }) => {
  const { sources } = useSources()
  if (failures.length === 0) return null
  const sourceName = (id: string) => sources.find((s) => s.id === id)?.name ?? id
  return (
    <Banner tone="warning">
      <p className="font-medium">Some sources could not be loaded</p>
      <ul className="mt-1 list-disc pl-4">
        {failures.map(({ provider, message }) => (
          <li key={provider}>
            {sourceName(provider)}: {message}
          </li>
        ))}
      </ul>
    </Banner>
  )
}

interface StateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

const CenteredState = ({ icon, title, description, action }: StateProps) => {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <div className="text-muted-foreground [&_svg]:size-8">{icon}</div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

export const EndNote = ({ capped, failed }: { capped: boolean; failed: boolean }) => (
  <p className="py-4 text-center text-sm text-muted-foreground">
    {failed
      ? "Some sources couldn't be reached, so this may not be everything."
      : capped
        ? "That's as far back as we load. Search or filter to find more."
        : "You're all caught up."}
  </p>
)

export const FeedEmptyState = ({ authors, onShowLatest }: { authors: string[]; onShowLatest: () => void }) => (
  <CenteredState
    icon={<NewspaperIcon aria-hidden />}
    title="Nothing from your picks yet"
    description={
      authors.length > 0
        ? `No recent articles by ${authors.join(', ')} in your sources. Only the Guardian can be searched by author, for the others we look through their latest articles.`
        : 'No recent articles match your preferences.'
    }
    action={
      <Button variant="outline" onClick={onShowLatest}>
        Show the latest news
      </Button>
    }
  />
)

export const EmptyState = ({ onClear }: { onClear?: () => void }) => {
  return (
    <CenteredState
      icon={<NewspaperIcon aria-hidden />}
      title="No articles found"
      description="Try a different keyword, or loosen the filters."
      action={
        onClear && (
          <Button variant="outline" onClick={onClear}>
            Clear search and filters
          </Button>
        )
      }
    />
  )
}

export const ErrorState = ({ onRetry, message }: { onRetry: () => void; message?: string | undefined }) => {
  return (
    <CenteredState
      icon={<AlertTriangleIcon aria-hidden />}
      title="We couldn't load any news"
      description={message ?? 'Every source failed to respond. Please try again in a moment.'}
      action={<Button onClick={onRetry}>Try again</Button>}
    />
  )
}

export const PersonalizePrompt = ({ action }: { action: ReactNode }) => {
  return (
    <CenteredState
      icon={<SparklesIcon aria-hidden />}
      title="Your feed is empty"
      description="Pick the sources, categories and authors you care about and we'll build a feed just for you."
      action={action}
    />
  )
}
