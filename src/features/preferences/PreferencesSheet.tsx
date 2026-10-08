import { SlidersHorizontalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { FilterSection } from '@/features/filters/FilterSection'
import { SourceCheckboxes } from '@/features/filters/SourceCheckboxes'
import { usePreferencesStore } from '@/store/preferences'
import { AuthorPicker } from './AuthorPicker'
import { CategoryToggles } from './CategoryToggles'

export const PreferencesSheet = () => {
  const { providerIds, categories, authors } = usePreferencesStore()
  const { toggleProvider, toggleCategory, toggleAuthor, clear } = usePreferencesStore.getState()
  const total = providerIds.length + categories.length + authors.length

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        <SlidersHorizontalIcon />
        Personalize
        {total > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{total}</span>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Personalize your feed</SheetTitle>
          <SheetDescription>
            Choose what you care about. Your picks are saved on this device and power the “For you” tab.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          <FilterSection title="Preferred sources">
            <SourceCheckboxes selected={providerIds} onToggle={toggleProvider} />
          </FilterSection>
          <FilterSection title="Preferred categories">
            <CategoryToggles selected={categories} onToggle={toggleCategory} />
          </FilterSection>
          <FilterSection title="Preferred authors">
            <AuthorPicker authors={authors} onToggle={toggleAuthor} />
          </FilterSection>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={clear} disabled={total === 0}>
            Reset preferences
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
