import { getRequestListener } from '@hono/node-server'
import { bootstrap } from './bootstrap'

// Vercel runs this as a serverless function and has no long-running server, so the static
// files come from Vercel itself and only the two /api/news routes are answered here.
// `pnpm build:vercel` bundles it into one file per route, see the README.
const { app } = bootstrap()

export default getRequestListener(app.fetch)
