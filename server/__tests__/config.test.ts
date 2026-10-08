// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../config'

describe('loadConfig', () => {
  it('uses safe defaults', () => {
    const config = loadConfig({})
    expect(config.port).toBe(8787)
    expect(config.trustProxy).toBe(false)
    expect(config.staticDir).toBeUndefined()
    expect(config.keys).toEqual({ guardian: undefined, nyt: undefined, newsApi: undefined })
  })

  it('reads keys, trims them and treats blanks as missing', () => {
    const config = loadConfig({ GUARDIAN_API_KEY: '  abc  ', NYT_API_KEY: '   ', NEWSAPI_API_KEY: '' })
    expect(config.keys).toEqual({ guardian: 'abc', nyt: undefined, newsApi: undefined })
  })

  it('ignores nonsense numbers instead of crashing', () => {
    expect(loadConfig({ PORT: 'abc' }).port).toBe(8787)
    expect(loadConfig({ RATE_LIMIT_PER_MINUTE: '-5' }).rateLimit.max).toBe(60)
  })

  it('only trusts proxy headers when explicitly told to', () => {
    expect(loadConfig({ TRUST_PROXY: 'true' }).trustProxy).toBe(true)
    expect(loadConfig({ TRUST_PROXY: 'yes' }).trustProxy).toBe(false)
  })
})
