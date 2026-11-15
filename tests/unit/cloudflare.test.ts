import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { cacheCloudflareEnv, getCloudflareEnv, getDatabase } from '../../server/utils/cloudflare'

function eventWithContext(context: Record<string, unknown>): H3Event {
  return { context } as unknown as H3Event
}

describe('cloudflare bindings', () => {
  it('prefers the request context bindings', () => {
    const requestEnv = { DB: { name: 'request' } } as unknown as Env
    cacheCloudflareEnv({ DB: { name: 'cached' } } as unknown as Env)
    const event = eventWithContext({ cloudflare: { env: requestEnv } })
    expect(getCloudflareEnv(event)).toBe(requestEnv)
  })

  it('reuses captured bindings for internal requests without a cloudflare context', () => {
    const env = { DB: { name: 'cached' } } as unknown as Env
    cacheCloudflareEnv(env)
    const event = eventWithContext({})
    expect(getCloudflareEnv(event)).toBe(env)
    expect(getDatabase(event)).toBe(env.DB)
  })
})
