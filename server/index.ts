import { serve } from '@hono/node-server'
import { createApp } from './app'
import { loadConfig } from './config'
import { createNewsAggregator } from './news/aggregator'
import { cacheProviders, createDemoProviders, createProviders } from './news/providers'

const config = loadConfig()

const live = createProviders(config.keys)
const demo = live.length === 0
const providers = cacheProviders(demo ? createDemoProviders() : live, config.cache)

const app = createApp({
  aggregator: createNewsAggregator(providers),
  demo,
  trustProxy: config.trustProxy,
  rateLimit: config.rateLimit,
  staticDir: config.staticDir,
})

const server = serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  // log the source names, never the keys
  console.log(
    `[server] listening on :${port} · sources: ${providers.map((p) => p.name).join(', ')}${demo ? ' (demo mode)' : ''}`,
  )
})

const shutdown = () => {
  server.close(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
