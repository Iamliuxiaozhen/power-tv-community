import { createError, readBody } from 'h3'
import { z } from 'zod'
import type { CommunityComment } from '#shared/community'

const commentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
})

export default defineEventHandler(async (event): Promise<CommunityComment> => {
  const themeId = requireThemeId(event)
  const user = await requireAuthenticatedUser(event)
  const parsed = commentSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Comments must contain between 1 and 2000 characters' })
  }

  const db = getDatabase(event)
  const theme = await getThemeRecord(db, themeId)
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'Theme not found' })
  await enforceRateLimit(event, 'comment', user.githubId)
  const created = await addComment(db, themeId, user.githubId, parsed.data.body)
  if (!created) throw createError({ statusCode: 404, statusMessage: 'Theme not found' })

  setResponseStatus(event, 201)
  return {
    ...created,
    body: parsed.data.body,
    status: 'visible',
    author: {
      githubId: user.githubId,
      login: user.login,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      githubUrl: user.githubUrl,
    },
  }
})
