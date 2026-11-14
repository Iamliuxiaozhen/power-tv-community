import { createError, getQuery } from 'h3'
import { z } from 'zod'
import type { DashboardResponse } from '#shared/community'

const dashboardQuerySchema = z.object({
  cursor: z.string().regex(/^[\w-]+$/).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
})

export default defineEventHandler(async (event): Promise<DashboardResponse> => {
  const user = await requireAuthenticatedUser(event)
  const parsed = dashboardQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid pagination query' })

  const db = getDatabase(event)
  try {
    const themes = await listOwnerThemes(db, user.githubId, true, {
      limit: parsed.data.limit,
      ...(parsed.data.cursor ? { cursor: parsed.data.cursor } : {}),
    })
    const favorites = await listReactedThemes(db, user.githubId, 'favorites')
    const stats = await getDashboardStats(db, user.githubId)
    return { themes, favorites, stats }
  }
  catch (error) {
    if (parsed.data.cursor && error instanceof ThemeRepositoryError && error.message === '分页游标无效') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid pagination cursor' })
    }
    throw error
  }
})
