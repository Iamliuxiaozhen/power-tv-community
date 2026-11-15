import { createError, getHeader, readMultipartFormData, type H3Event } from 'h3'
import type { PublishThemeResponse } from '#shared/community'
import type { ThemeValidationIssue } from '#shared/theme/types'
import { ThemeValidationError } from '#shared/theme/validator'
import { getDatabase, getThemeBucket } from './cloudflare'
import { MAX_PACKAGE_BYTES, validateThemePackage } from './theme-archive'
import { publishTheme, ThemeRepositoryError } from './repositories/themes'

const MAX_MULTIPART_BYTES = MAX_PACKAGE_BYTES + 64 * 1024

export async function publishThemeUpload(
  event: H3Event,
  ownerId: number,
  expectedThemeId?: string,
): Promise<PublishThemeResponse> {
  const upload = await readThemeUpload(event)
  try {
    const input = await validateThemePackage(upload.data)
    const params = { ownerId, fileName: upload.fileName, input }
    if (expectedThemeId) {
      return await publishTheme(getDatabase(event), getThemeBucket(event), { ...params, expectedThemeId })
    }
    return await publishTheme(getDatabase(event), getThemeBucket(event), params)
  }
  catch (error) {
    return throwThemeUploadError(error)
  }
}

async function readThemeUpload(event: H3Event): Promise<{ fileName: string, data: Uint8Array }> {
  const declaredBytes = Number(getHeader(event, 'content-length'))
  if (Number.isFinite(declaredBytes) && declaredBytes > MAX_MULTIPART_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Theme package exceeds the 10 MiB limit' })
  }

  let parts: Awaited<ReturnType<typeof readMultipartFormData>>
  try {
    parts = await readMultipartFormData(event)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid multipart upload' })
  }

  const part = parts?.[0]
  if (!part || parts?.length !== 1 || part.name !== 'file' || !part.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Upload exactly one theme package in the file field' })
  }

  const fileName = normalizeUploadFilename(part.filename)
  if (!/\.(?:ptheme|zip|json)$/i.test(fileName)) {
    throw createError({ statusCode: 400, statusMessage: 'Only .ptheme, .zip, and .json theme packages are supported' })
  }
  if (part.data.byteLength === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Theme package cannot be empty' })
  }
  if (part.data.byteLength > MAX_PACKAGE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Theme package exceeds the 10 MiB limit' })
  }

  return { fileName, data: part.data }
}

export function normalizeUploadFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? ''
  const cleaned = [...basename]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0
      return code > 31 && code !== 127
    })
    .join('')
    .trim()
  return cleaned.slice(0, 255) || 'theme.ptheme'
}

export function throwThemeUploadError(error: unknown): never {
  if (error instanceof ThemeValidationError) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid theme package',
      data: {
        message: error.message,
        ...(error.issues[0]?.code ? { messageKey: error.issues[0].code } : {}),
        issues: error.issues satisfies ThemeValidationIssue[],
      },
    })
  }
  if (error instanceof ThemeRepositoryError) {
    const statusCode = {
      not_found: 404,
      forbidden: 403,
      conflict: 409,
      deleted: 410,
    }[error.code]
    throw createError({
      statusCode,
      statusMessage: 'Theme publish failed',
      data: {
        message: error.message,
        ...(error.messageKey ? { messageKey: error.messageKey } : {}),
      },
    })
  }
  throw error
}
