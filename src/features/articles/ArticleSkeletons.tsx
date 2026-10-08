import { Skeleton } from '@/components/ui/skeleton'

export const ArticleSkeletons = ({ count = 6 }: { count?: number }) => {
  return (
    <ul aria-hidden className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <Skeleton className="aspect-video rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}
