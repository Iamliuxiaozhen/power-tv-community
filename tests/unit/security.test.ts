import { describe, expect, it } from 'vitest'
import { isAllowedOrigin, safeReturnTo } from '#shared/security'

describe('safeReturnTo', () => {
  it.each([
    ['/themes/aurora?version=1.2.0#history', '/themes/aurora?version=1.2.0#history'],
    ['//evil.example', '/'],
    ['https://evil.example', '/'],
    ['/\\evil.example', '/'],
    ['/%0ASet-Cookie:test', '/%0ASet-Cookie:test'],
    ['/\nredirect', '/'],
    [42, '/'],
    [undefined, '/'],
  ])('normalizes %j', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected)
  })
})

describe('isAllowedOrigin', () => {
  it('accepts only an exact allowed serialized origin', () => {
    expect(isAllowedOrigin('https://community.example', ['https://community.example'])).toBe(true)
    expect(isAllowedOrigin('https://evil.example', ['https://community.example'])).toBe(false)
    expect(isAllowedOrigin('https://community.example/path', ['https://community.example'])).toBe(false)
    expect(isAllowedOrigin('null', ['https://community.example'])).toBe(false)
    expect(isAllowedOrigin(undefined, ['https://community.example'])).toBe(false)
  })
})
