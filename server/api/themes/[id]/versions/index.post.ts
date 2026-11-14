import type { PublishThemeResponse } from '#shared/community'

export default defineEventHandler(async (event): Promise<PublishThemeResponse> => {
  const themeId = requireThemeId(event)
  const { theme, user } = await requireThemeAuthor(event, themeId)
  if (theme.status === 'deleted') {
    throw createError({ statusCode: 410, statusMessage: 'Deleted themes cannot be updated' })
  }
  await enforceRateLimit(event, 'upload', user.githubId)
  const result = await publishThemeUpload(event, user.githubId, themeId)
  setResponseStatus(event, 201)
  return result
})
