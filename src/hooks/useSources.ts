import { useQuery } from '@tanstack/react-query'
import type { SourceInfo } from '@shared/api'
import { newsClient } from '@/services/news/newsClient'

const NO_SOURCES: SourceInfo[] = []

// sources the server has set up, and whether it's serving demo data
export const useSources = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: ({ signal }) => newsClient.sources(signal),
    staleTime: Infinity,
  })
  return { sources: data?.sources ?? NO_SOURCES, isDemo: data?.demo ?? false, isLoading }
}
