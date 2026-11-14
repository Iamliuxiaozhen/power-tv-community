import { createError, getQuery } from 'h3'
import { z } from 'zod'
import type { ThemeListResponse } from '#shared/community'

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['latest', 'downloads', 'likes']).default('latest'),
  cursor: z.string().regex(/^[\w-]+$/).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
})

export default defineEventHandler(async (event): Promise<ThemeListResponse> => {
  const parsed = listQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid catalog query' })
  }

  try {
    return await listPublishedThemes(getDatabase(event), {
      ...(parsed.data.q ? { search: parsed.data.q } : {}),
      sort: parsed.data.sort,
      ...(parsed.data.cursor ? { cursor: parsed.data.cursor } : {}),
      limit: parsed.data.limit,
    })
  }
  catch (error) {
    if (parsed.data.cursor && error instanceof ThemeRepositoryError && error.message === '分页游标无效') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid pagination cursor' })
    }
    throw error
  }
})
