import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'news-theme'

const toggleTheme = () => {
  const isDark = document.documentElement.classList.toggle('dark')
  try {
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
  } catch {
    // localStorage can throw in private mode, the toggle still works for this visit
  }
}

export const ThemeToggle = () => {
  return (
    <Button variant="ghost" size="icon" aria-label="Toggle dark mode" onClick={toggleTheme}>
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </Button>
  )
}
