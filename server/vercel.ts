import { handle } from 'hono/vercel'
import { bootstrap } from './bootstrap'

// Vercel runs this as a serverless function and has no long-running server, so the static
// files come from Vercel itself and only /api is answered here. Built into one file by
// `pnpm build:vercel`, see the README.
const { app } = bootstrap()

export const GET = handle(app)
export const POST = handle(app)
