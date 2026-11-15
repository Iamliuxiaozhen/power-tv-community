import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compareVersions, normalizeVersion, parseVersion } from '../../shared/theme/version'
import { localizedText, ThemeValidationError, validateThemeManifest } from '../../shared/theme/validator'
import template from '../fixtures/template.theme.json'

describe('theme versions', () => {
  it('normalizes missing and short versions', () => {
    expect(normalizeVersion()).toBe('1.0.0')
    expect(normalizeVersion('2.4')).toBe('2.4.0')
    expect(normalizeVersion('0002.004.00001')).toBe('2.4.1')
  })

  it('compares arbitrarily large numeric segments', () => {
    expect(compareVersions('999999999999999999999.0.0', '1000000000000000000000.0.0')).toBe(-1)
    expect(compareVersions('2.10.0', '2.9.99')).toBe(1)
    expect(compareVersions('1.2', '1.2.0')).toBe(0)
    expect(parseVersion('1.2.3').parts).toEqual(['1', '2', '3'])
  })

  it('rejects invalid versions', () => {
    expect(() => normalizeVersion('v1.2.3')).toThrow()
    expect(() => normalizeVersion('1.2.3.4')).toThrow()
  })
})

describe('manifest validation', () => {
  it('accepts the upstream template and applies a default version', () => {
    const input: Record<string, unknown> = structuredClone(template)
    delete input.version
    expect(validateThemeManifest(input).version).toBe('1.0.0')
  })

  it.each(['builtin.dark', 'user..dark', 'x', 'user/dark'])('rejects reserved or malformed id %s', (id) => {
    expect(() => validateThemeManifest({ ...template, id })).toThrow(ThemeValidationError)
  })

  it('rejects unknown fields, invalid colors and invisible modules outside the order', () => {
    expect(() => validateThemeManifest({ ...template, executable: 'run' })).toThrow(ThemeValidationError)
    expect(() => validateThemeManifest({
      ...template,
      schemes: { light: { primary: 'red' } },
    })).toThrow(ThemeValidationError)
    expect(() => validateThemeManifest({
      ...template,
      layout: { order: ['hero', 'cpu'], visible: ['gpu'] },
    })).toThrow(ThemeValidationError)
  })

  it('uses the documented display text fallback', () => {
    expect(localizedText({ en: 'Ocean', 'zh-CN': '海洋' })).toBe('海洋')
    expect(localizedText({ default: 'Default', en: 'English' })).toBe('English')
    expect(localizedText({ fr: 'Mer' })).toBe('Mer')
  })

  it('ships a precompiled validator that avoids runtime code generation', () => {
    const source = readFileSync(new URL('../../shared/theme/theme-validator.generated.ts', import.meta.url), 'utf8')
    expect(source).not.toContain('new Function')
    expect(source).not.toMatch(/\brequire\(/)
    expect(source).toMatch(/export default validate\d+/)
  })
})
