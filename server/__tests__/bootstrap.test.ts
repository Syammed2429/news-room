// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bootstrap } from '../bootstrap'
import { loadConfig } from '../config'

describe('bootstrap', () => {
  it('serves sample sources when no keys are set', async () => {
    const { app, demo } = bootstrap(loadConfig({}))
    expect(demo).toBe(true)
    const response = await app.request('/api/news/sources')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ demo: true })
  })

  it('uses only the sources that have a key', async () => {
    const { providers, demo } = bootstrap(loadConfig({ GUARDIAN_API_KEY: 'k' }))
    expect(demo).toBe(false)
    expect(providers.map((p) => p.id)).toEqual(['guardian'])
  })
})
