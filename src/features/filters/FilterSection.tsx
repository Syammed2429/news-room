import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

export const FilterSection = ({ title, children }: Props) => {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  )
}
