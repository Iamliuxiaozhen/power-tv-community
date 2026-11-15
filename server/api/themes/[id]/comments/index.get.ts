import { createError, getQuery } from 'h3'
import { z } from 'zod'
import type { CommentListResponse } from '#shared/community'

const commentQuerySchema = z.object({
  cursor: z.string().max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export default defineEventHandler(async (event): Promise<CommentListResponse> => {
  const themeId = requireThemeId(event)
  const parsed = commentQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid comment pagination' })

  const db = getDatabase(event)
  const theme = await getThemeRecord(db, themeId)
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'Theme not found' })
  try {
    return await listComments(db, themeId, parsed.data.cursor, parsed.data.limit)
  }
  catch (error) {
    if (parsed.data.cursor && error instanceof Error && error.message === '评论分页游标无效') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid comment cursor' })
    }
    throw error
  }
})
