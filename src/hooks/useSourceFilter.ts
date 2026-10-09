import { withinSources } from '@/lib/filters'
import { usePreferencesStore } from '@/store/preferences'
import { useSearchStore } from '@/store/search'

// The source filter as the current tab sees it. On "For you" it can only narrow the preferred
// sources, so `only` lists the ones to offer and `selected` drops anything outside them.
export const useSourceFilter = () => {
  const view = useSearchStore((s) => s.view)
  const providerIds = useSearchStore((s) => s.providerIds)
  const preferred = usePreferencesStore((s) => s.providerIds)

  const only = view === 'feed' ? preferred : []
  return { only, selected: withinSources(providerIds, only) }
}
