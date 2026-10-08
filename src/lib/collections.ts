export const toggleItem = <T>(list: T[], item: T): T[] => {
  return list.includes(item) ? list.filter((existing) => existing !== item) : [...list, item]
}
