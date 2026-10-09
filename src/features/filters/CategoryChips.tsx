import { Chip } from '@/components/Chip'
import { withinCategories } from '@/lib/filters'
import { usePreferencesStore } from '@/store/preferences'
import { useSearchStore } from '@/store/search'
import { CATEGORIES, CATEGORY_LABELS } from '@shared/news'

export const CategoryChips = () => {
  const view = useSearchStore((s) => s.view)
  const chosen = useSearchStore((s) => s.category)
  const setCategory = useSearchStore((s) => s.setCategory)
  const preferred = usePreferencesStore((s) => s.categories)

  // On "For you" the chips narrow the preferred categories, so those are the only ones offered
  const only = view === 'feed' ? preferred : []
  const offered = only.length > 0 ? CATEGORIES.filter((item) => only.includes(item)) : CATEGORIES
  const category = withinCategories(chosen, only)

  return (
    <nav
      aria-label="Categories"
      // scrolls sideways on phones
      className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex gap-2">
        <li>
          <Chip pressed={category === null} onClick={() => setCategory(null)}>
            All
          </Chip>
        </li>
        {offered.map((item) => (
          <li key={item}>
            <Chip pressed={category === item} onClick={() => setCategory(category === item ? null : item)}>
              {CATEGORY_LABELS[item]}
            </Chip>
          </li>
        ))}
      </ul>
    </nav>
  )
}
