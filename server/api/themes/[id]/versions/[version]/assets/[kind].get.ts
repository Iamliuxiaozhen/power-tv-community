import { createError, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const kind = getRouterParam(event, 'kind')
  if (kind !== 'preview' && kind !== 'backdrop') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid theme asset' })
  }
  const requestedVersion = requireThemeVersion(event)
  const { version } = await requirePublishedVersion(event, requestedVersion)
  return serveThemeImage(event, version, kind)
})
