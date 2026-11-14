import type { PublishThemeResponse } from '#shared/community'

export default defineEventHandler(async (event): Promise<PublishThemeResponse> => {
  const user = await requireAuthenticatedUser(event)
  await enforceRateLimit(event, 'upload', user.githubId)
  const result = await publishThemeUpload(event, user.githubId)
  setResponseStatus(event, 201)
  return result
})
