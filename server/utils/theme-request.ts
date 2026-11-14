import { createError, getRouterParam, type H3Event } from 'h3'
import { normalizeVersion } from '#shared/theme/version'

export function requireThemeId(event: H3Event): string {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/.test(id) || id.includes('..') || id.toLowerCase().startsWith('builtin.')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid theme ID' })
  }
  return id
}

export function requireThemeVersion(event: H3Event): string {
  const value = getRouterParam(event, 'version')
  try {
    return normalizeVersion(value)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid theme version' })
  }
}

export async function requirePublishedVersion(event: H3Event, requestedVersion?: string) {
  const themeId = requireThemeId(event)
  const theme = await getThemeRecord(getDatabase(event), themeId)
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'Theme not found' })

  const version = await getVersionRecord(getDatabase(event), themeId, requestedVersion ?? theme.latest_version)
  if (!version) throw createError({ statusCode: 404, statusMessage: 'Theme version not found' })
  return { theme, version }
}
