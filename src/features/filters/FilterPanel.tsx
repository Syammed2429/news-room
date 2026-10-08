import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSearchStore } from '@/store/search'
import { DateRangeFields } from './DateRangeFields'
import { FilterSection } from './FilterSection'
import { SourceCheckboxes } from './SourceCheckboxes'

// "For you" skips these, it uses the saved preferences
export const FilterPanel = () => {
  const { view, providerIds, from, to } = useSearchStore()
  const { toggleProvider, setFrom, setTo, resetFilters } = useSearchStore.getState()
  const feedMode = view === 'feed'
  const hasActiveFilters = Boolean(providerIds.length || from || to)

  return (
    <div className="flex flex-col gap-5">
      {feedMode ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Your feed uses the sources and categories saved in your preferences. Date filters still apply.
        </p>
      ) : (
        <>
          <FilterSection title="Sources">
            <SourceCheckboxes selected={providerIds} onToggle={toggleProvider} />
          </FilterSection>
          <Separator />
        </>
      )}
      <FilterSection title="Date">
        <DateRangeFields from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </FilterSection>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
