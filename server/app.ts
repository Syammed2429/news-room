import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { rateLimit } from './http/rateLimit'
import { requireSameOrigin } from './http/sameOrigin'
import type { NewsAggregator } from './news/aggregator'
import { newsRoutes } from './routes/news'

interface Deps {
  aggregator: NewsAggregator
  demo: boolean
  trustProxy: boolean
  rateLimit: { windowMs: number; max: number }
  // built SPA folder, relative to the working directory
  staticDir?: string | undefined
}

export const createApp = ({ aggregator, demo, trustProxy, rateLimit: limits, staticDir }: Deps) => {
  const app = new Hono()

  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        // the UI libraries write inline style attributes, scripts stay same-origin only
        styleSrc: ["'self'", "'unsafe-inline'"],
        // thumbnails come from the publishers' own CDNs
        imgSrc: ["'self'", 'https:', 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
      referrerPolicy: 'no-referrer',
      xFrameOptions: 'DENY',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [], payment: [] },
    }),
  )

  app.get('/healthz', (c) => c.text('ok'))

  app.use('/api/*', requireSameOrigin())
  app.use('/api/*', rateLimit({ ...limits, trustProxy }))
  app.route('/api/news', newsRoutes({ aggregator, demo }))
  app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404))

  if (staticDir) {
    // Vite hashes these file names, so they can be cached for a year
    app.use('/assets/*', async (c, next) => {
      await next()
      if (c.res.ok) c.header('Cache-Control', 'public, max-age=31536000, immutable')
    })
    // never cache the HTML, an old copy points at assets that are gone
    app.use('*', async (c, next) => {
      await next()
      if (c.res.headers.get('content-type')?.startsWith('text/html')) c.header('Cache-Control', 'no-cache')
    })
    app.use('*', serveStatic({ root: staticDir }))
    // unknown paths get the app
    app.get('*', serveStatic({ path: `${staticDir}/index.html` }))
  }

  // no stack traces or upstream details in the response, just the error name in the log
  app.onError((error, c) => {
    console.error(`[server] unhandled ${error.name}`)
    return c.json({ error: 'Internal server error' }, 500)
  })

  return app
}
