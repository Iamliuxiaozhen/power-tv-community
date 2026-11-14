import { createError, readBody } from 'h3'
import { z } from 'zod'
import type { ThemeReactionResponse } from '#shared/community'

const reactionSchema = z.object({
  reaction: z.enum(['like', 'favorite']),
  active: z.boolean(),
})

export default defineEventHandler(async (event): Promise<ThemeReactionResponse> => {
  const themeId = requireThemeId(event)
  const user = await requireAuthenticatedUser(event)
  const parsed = reactionSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid reaction' })

  const db = getDatabase(event)
  const theme = await getThemeRecord(db, themeId)
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'Theme not found' })
  await enforceRateLimit(event, 'interaction', user.githubId)

  const reaction = parsed.data.reaction === 'like' ? 'likes' : 'favorites'
  await setThemeReaction(db, user.githubId, themeId, reaction, parsed.data.active)
  const state = await getReactionState(db, user.githubId, themeId)
  const updatedTheme = await getThemeRecord(db, themeId)
  return { ...state, likes: updatedTheme?.likes ?? theme.likes }
})
