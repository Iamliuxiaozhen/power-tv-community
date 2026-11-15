import { describe, expect, it } from 'vitest'
import type { H3Error } from 'h3'
import { ThemeValidationError } from '#shared/theme/validator'
import { ThemeRepositoryError } from '../../server/utils/repositories/themes'
import { normalizeUploadFilename, throwThemeUploadError } from '../../server/utils/theme-upload'

function capturedError(error: unknown): H3Error {
  try {
    throwThemeUploadError(error)
  }
  catch (caught) {
    return caught as H3Error
  }
}

describe('theme upload handling', () => {
  it('normalizes multipart filenames without paths or control characters', () => {
    expect(normalizeUploadFilename('C:\\fakepath\\my\u0000-theme.ptheme')).toBe('my-theme.ptheme')
    expect(normalizeUploadFilename('../folder/ocean.zip')).toBe('ocean.zip')
    expect(normalizeUploadFilename('')).toBe('theme.ptheme')
  })

  it('returns validation issues with a 400 response', () => {
    const error = capturedError(new ThemeValidationError([{ path: '/version', message: '主题版本号无效' }]))
    expect(error.statusCode).toBe(400)
    expect(error.data).toEqual({
      message: '主题版本号无效',
      issues: [{ path: '/version', message: '主题版本号无效' }],
    })
  })

  it.each([
    ['forbidden', 403],
    ['conflict', 409],
    ['deleted', 410],
    ['not_found', 404],
  ] as const)('maps repository %s errors to HTTP %i', (code, statusCode) => {
    const error = capturedError(new ThemeRepositoryError('failure', code))
    expect(error.statusCode).toBe(statusCode)
    expect(error.data).toEqual({ message: 'failure' })
  })

  it('exposes stable message keys for localized validation and repository errors', () => {
    const validation = capturedError(new ThemeValidationError([
      { path: '/version', message: '主题版本号无效', code: 'validation.version' },
    ]))
    expect(validation.data).toEqual({
      message: '主题版本号无效',
      messageKey: 'validation.version',
      issues: [{ path: '/version', message: '主题版本号无效', code: 'validation.version' }],
    })

    const repository = capturedError(new ThemeRepositoryError('failure', 'conflict', 'publish.idOrVersionExists'))
    expect(repository.data).toEqual({ message: 'failure', messageKey: 'publish.idOrVersionExists' })
  })

  it('does not hide unexpected failures', () => {
    const error = new Error('storage unavailable')
    expect(() => throwThemeUploadError(error)).toThrow(error)
  })
})
