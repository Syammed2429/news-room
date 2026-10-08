import { Chip } from '@/components/Chip'
import { useSearchStore } from '@/store/search'
import { CATEGORIES, CATEGORY_LABELS } from '@shared/news'

export const CategoryChips = () => {
  const category = useSearchStore((s) => s.category)
  const setCategory = useSearchStore((s) => s.setCategory)

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
        {CATEGORIES.map((item) => (
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
