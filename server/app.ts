import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
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
        manifestSrc: ["'self'"],
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

  // gzip everything over 1 KB: the JS bundle is ~700 kB raw and about a third of that gzipped
  app.use(compress())

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
    // a missing hashed file must 404, otherwise the HTML would be cached as if it were that file
    app.all('/assets/*', (c) => c.text('Not found', 404))
    // Vercel Web Analytics asks for a script that only exists on Vercel. A 404 stops the page
    // being handed back as if it were that script.
    app.all('/_vercel/*', (c) => c.text('Not found', 404))
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
