import { Chip } from '@/components/Chip'
import { CATEGORIES, CATEGORY_LABELS, type Category } from '@shared/news'

interface Props {
  selected: Category[]
  onToggle: (category: Category) => void
}

export const CategoryToggles = ({ selected, onToggle }: Props) => (
  <ul className="flex flex-wrap gap-2">
    {CATEGORIES.map((category) => (
      <li key={category}>
        <Chip pressed={selected.includes(category)} onClick={() => onToggle(category)}>
          {CATEGORY_LABELS[category]}
        </Chip>
      </li>
    ))}
  </ul>
)
