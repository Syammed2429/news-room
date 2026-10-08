import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { Article } from '@shared/news'
import { ArticleCard } from './ArticleCard'

interface Props {
  articles: Article[]
  // dims the list while a new one is loading
  dimmed?: boolean
  // show the first article as a big top story, when it has a picture
  topStory?: boolean
}

export const ArticleGrid = ({ articles, dimmed = false, topStory = false }: Props) => (
  <motion.ul
    className={cn('grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3', dimmed && 'opacity-50')}
  >
    {articles.map((article, index) => {
      const isLead = topStory && index === 0 && Boolean(article.imageUrl)
      return (
        <li key={article.id} className={cn(isLead && 'sm:col-span-2 xl:col-span-3')}>
          <ArticleCard article={article} index={index} variant={isLead ? 'lead' : 'default'} />
        </li>
      )
    })}
  </motion.ul>
)
