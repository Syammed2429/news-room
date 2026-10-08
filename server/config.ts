import type { ApiKeys } from './news/providers'

export interface AppConfig {
  port: number
  // only turn on behind a proxy you run, X-Forwarded-For can be faked
  trustProxy: boolean
  // built SPA to serve, unset in dev where Vite does it
  staticDir: string | undefined
  keys: ApiKeys
  cache: { ttlMs: number; errorTtlMs: number; maxEntries: number }
  rateLimit: { windowMs: number; max: number }
}

const clean = (value: string | undefined): string | undefined => value?.trim() || undefined

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  port: toInt(env['PORT'], 8787),
  trustProxy: env['TRUST_PROXY'] === 'true',
  staticDir: clean(env['STATIC_DIR']),
  keys: {
    guardian: clean(env['GUARDIAN_API_KEY']),
    nyt: clean(env['NYT_API_KEY']),
    newsApi: clean(env['NEWSAPI_API_KEY']),
  },
  cache: {
    ttlMs: toInt(env['CACHE_TTL_SECONDS'], 300) * 1000,
    errorTtlMs: 15_000,
    maxEntries: 500,
  },
  rateLimit: {
    windowMs: 60_000,
    max: toInt(env['RATE_LIMIT_PER_MINUTE'], 60),
  },
})
