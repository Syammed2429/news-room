import { useQuery } from '@tanstack/react-query'
import type { SourceInfo } from '@shared/api'
import { newsClient } from '@/services/news/newsClient'
import { usePreferencesStore } from '@/store/preferences'
import { useSearchStore } from '@/store/search'

const NO_SOURCES: SourceInfo[] = []

// sources the server has set up, and whether it's serving demo data
export const useSources = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: async ({ signal }) => {
      const response = await newsClient.sources(signal)
      // a link or a saved choice can name a source this server doesn't have
      const known = response.sources.map((source) => source.id)
      useSearchStore.getState().keepProviders(known)
      usePreferencesStore.getState().keepProviders(known)
      return response
    },
    staleTime: Infinity,
  })
  return { sources: data?.sources ?? NO_SOURCES, isDemo: data?.demo ?? false, isLoading }
}
