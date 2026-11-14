import { describe, expect, it } from 'vitest'
import { contentDisposition, isAllowedOrigin, safeDownloadFileName, safeReturnTo } from '#shared/security'

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

describe('download file names', () => {
  it.each([
    ['../../aurora.ptheme', 'aurora.ptheme'],
    ['..\\aurora.ptheme', 'aurora.ptheme'],
    ['bad\r\n"name.ptheme', 'bad___name.ptheme'],
    ['...', 'theme.ptheme'],
  ])('sanitizes %j', (input, expected) => {
    expect(safeDownloadFileName(input)).toBe(expected)
  })

  it('creates an ASCII fallback and UTF-8 filename', () => {
    expect(contentDisposition('深色.ptheme')).toBe(
      'attachment; filename="__.ptheme"; filename*=UTF-8\'\'%E6%B7%B1%E8%89%B2.ptheme',
    )
    expect(contentDisposition('aurora.ptheme', 'inline')).toBe(
      'inline; filename="aurora.ptheme"; filename*=UTF-8\'\'aurora.ptheme',
    )
  })
})
