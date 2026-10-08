import type { SourcesResponse } from '@shared/api'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { NewsAggregator } from '../news/aggregator'
import { searchBodySchema } from '@shared/schemas'

interface Deps {
  aggregator: NewsAggregator
  demo: boolean
}

const MAX_BODY_BYTES = 8 * 1024

export const newsRoutes = ({ aggregator, demo }: Deps) => {
  const routes = new Hono()

  routes.get('/sources', (c) => {
    const body: SourcesResponse = {
      sources: aggregator.providers.map(({ id, name }) => ({ id, name })),
      demo,
    }
    c.header('Cache-Control', 'public, max-age=300')
    return c.json(body)
  })

  routes.post(
    '/search',
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: (c) => c.json({ error: 'Request body too large' }, 413),
    }),
    async (c) => {
      const payload: unknown = await c.req.json().catch(() => undefined)
      const parsed = searchBodySchema.safeParse(payload)
      // don't say why it failed, that only helps someone probing the API
      if (!parsed.success) return c.json({ error: 'Invalid request' }, 400)

      const result = await aggregator.search(parsed.data.request, parsed.data.cursor, c.req.raw.signal)
      c.header('Cache-Control', 'no-store')
      return c.json(result)
    },
  )

  return routes
}
