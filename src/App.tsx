import { Analytics } from '@vercel/analytics/react'
import { BackToTop } from '@/components/BackToTop'
import { LoadingBar } from '@/components/LoadingBar'
import { Header } from '@/components/layout/Header'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Banner } from '@/features/articles/Notices'
import { ResultsView } from '@/features/articles/ResultsView'
import { ActiveFilters } from '@/features/filters/ActiveFilters'
import { CategoryChips } from '@/features/filters/CategoryChips'
import { FilterPanel } from '@/features/filters/FilterPanel'
import { MobileFilters } from '@/features/filters/MobileFilters'
import { RecentSearches } from '@/features/search/RecentSearches'
import { SearchBar } from '@/features/search/SearchBar'
import { useSources } from '@/hooks/useSources'
import { useSavedStore } from '@/store/saved'
import { useSearchStore, type FeedView } from '@/store/search'

const HEADINGS: Record<FeedView, string> = {
  latest: 'Latest news',
  feed: 'Your news feed',
  saved: 'Saved articles',
}

const App = () => {
  const view = useSearchStore((s) => s.view)
  const setView = useSearchStore((s) => s.setView)
  const { isDemo } = useSources()
  const savedCount = useSavedStore((s) => s.articles.length)

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to articles
      </a>
      <Header />
      <main className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[16rem_1fr]">
        <BackToTop />
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-20">
            <FilterPanel />
          </div>
        </aside>
        <div id="content" tabIndex={-1} className="flex min-w-0 flex-col gap-4 outline-none">
          <h1 className="sr-only">{HEADINGS[view]}</h1>
          {isDemo && (
            <Banner>
              Showing sample articles. Add API keys on the server (see the README) to load live news.
            </Banner>
          )}
          <SearchBar />
          {view !== 'saved' && <RecentSearches />}
          {/* Stays in view while scrolling so the reader can switch topic at any depth. */}
          <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-3 bg-background/90 px-4 py-3 backdrop-blur lg:mx-0 lg:px-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <Tabs value={view} onValueChange={(next) => setView(next as FeedView)}>
                <TabsList>
                  <TabsTrigger value="latest">Latest</TabsTrigger>
                  <TabsTrigger value="feed">For you</TabsTrigger>
                  <TabsTrigger value="saved">
                    Saved
                    {savedCount > 0 && <span className="ml-1 text-xs tabular-nums opacity-70">{savedCount}</span>}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <MobileFilters />
            </div>
            {view !== 'saved' && <CategoryChips />}
            <LoadingBar />
          </div>
          <ActiveFilters />
          <ResultsView />
        </div>
      </main>
      <BackToTopSpacer />
      <Analytics />
    </div>
  )
}

// leaves room under the last card for the back-to-top button
const BackToTopSpacer = () => <div aria-hidden className="h-16" />

export default App
