import { createError, getQuery, getRouterParam } from 'h3'
import { z } from 'zod'
import type { PublicUser, UserThemesResponse } from '#shared/community'

const pageQuerySchema = z.object({
  cursor: z.string().regex(/^[\w-]+$/).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
})

export default defineEventHandler(async (event): Promise<UserThemesResponse> => {
  const login = getRouterParam(event, 'login')
  if (!login || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid GitHub username' })
  }
  const parsed = pageQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid pagination query' })
  }

  const db = getDatabase(event)
  const user = await findUserByLogin(db, login)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  try {
    const page = await listOwnerThemes(db, Number(user.github_id), false, {
      limit: parsed.data.limit,
      ...(parsed.data.cursor ? { cursor: parsed.data.cursor } : {}),
    })
    const publicUser: PublicUser = {
      githubId: Number(user.github_id),
      login: String(user.login),
      displayName: user.display_name ? String(user.display_name) : null,
      avatarUrl: String(user.avatar_url),
      githubUrl: String(user.github_url),
      createdAt: String(user.created_at),
    }
    return { user: publicUser, ...page }
  }
  catch (error) {
    if (parsed.data.cursor && error instanceof ThemeRepositoryError && error.message === '分页游标无效') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid pagination cursor' })
    }
    throw error
  }
})
