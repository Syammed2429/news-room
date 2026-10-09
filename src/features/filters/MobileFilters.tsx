import { FilterIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useSourceFilter } from '@/hooks/useSourceFilter'
import { useSearchStore } from '@/store/search'
import { FilterPanel } from './FilterPanel'

export const MobileFilters = () => {
  const { from, to } = useSearchStore()
  const { selected } = useSourceFilter()
  const active = [from, to].filter(Boolean).length + selected.length

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>
        <FilterIcon />
        {/* only the icon fits next to the tabs on the narrowest phones */}
        <span className="max-[26rem]:sr-only">Filters</span>
        {active > 0 && (
          <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{active}</span>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-4/5 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Narrow results by source and date.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <FilterPanel />
        </div>
      </SheetContent>
    </Sheet>
  )
}
