import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSourceFilter } from '@/hooks/useSourceFilter'
import { useSearchStore } from '@/store/search'
import { DateRangeFields } from './DateRangeFields'
import { FilterSection } from './FilterSection'
import { SourceCheckboxes } from './SourceCheckboxes'

export const FilterPanel = () => {
  const { view, from, to } = useSearchStore()
  const { toggleProvider, setFrom, setTo, resetFilters } = useSearchStore.getState()
  const { only, selected } = useSourceFilter()
  const hasActiveFilters = Boolean(selected.length || from || to)

  return (
    <div className="flex flex-col gap-5">
      {view === 'feed' && (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          These narrow down what is in your preferences.
        </p>
      )}
      <FilterSection title="Sources">
        <SourceCheckboxes selected={selected} only={only} onToggle={toggleProvider} />
      </FilterSection>
      <Separator />
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
