import { serve } from '@hono/node-server'
import { bootstrap } from './bootstrap'

const { app, providers, demo, config } = bootstrap()

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
