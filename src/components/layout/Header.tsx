import { NewspaperIcon } from 'lucide-react'
import { PreferencesSheet } from '@/features/preferences/PreferencesSheet'
import { ThemeToggle } from './ThemeToggle'

export const Header = () => {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
        <a href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <NewspaperIcon aria-hidden className="size-4" />
          </span>
          Newsroom
        </a>
        <div className="flex items-center gap-1.5">
          <PreferencesSheet />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
