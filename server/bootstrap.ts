import { createApp } from './app'
import { loadConfig, type AppConfig } from './config'
import { createNewsAggregator } from './news/aggregator'
import { cacheProviders, createDemoProviders, createProviders } from './news/providers'

// Builds the app from the environment. Both the Node server and the Vercel function use it,
// so they can't drift apart.
export const bootstrap = (config: AppConfig = loadConfig()) => {
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
  return { app, providers, demo, config }
}
