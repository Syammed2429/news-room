import type { Category } from '@shared/news'

// maps our categories to a provider's names, dropping the ones it doesn't have
export const mapCategories = (
  categories: Category[],
  table: Partial<Record<Category, string>>,
): string[] => [...new Set(categories.flatMap((category) => table[category] ?? []))]
