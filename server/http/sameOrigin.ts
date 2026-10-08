import type { MiddlewareHandler } from 'hono'

// Browsers send Sec-Fetch-Site on every request. A script on another website calling this API
// from a visitor's browser arrives as "cross-site", so we refuse it. curl and tests don't send
// the header and get through; the rate limit and validation still apply to them.
export const requireSameOrigin = (): MiddlewareHandler => async (c, next) => {
  const site = c.req.header('sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
  return undefined
}
