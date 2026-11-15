import type { H3Event } from 'h3'
import { getThemeRecord } from './repositories/themes'
import { consumeRateLimit } from './repositories/rate-limits'

const RATE_LIMITS = {
  upload: { maximum: 10, windowMs: 60 * 60 * 1000 },
  comment: { maximum: 30, windowMs: 60 * 60 * 1000 },
  report: { maximum: 10, windowMs: 60 * 60 * 1000 },
  interaction: { maximum: 120, windowMs: 60 * 60 * 1000 },
} as const

export type RateLimitAction = keyof typeof RATE_LIMITS

export async function requireAuthenticatedUser(event: H3Event) {
  const session = await readUserSession(event)
  if (!session.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return session.user
}

export async function requireThemeAuthor(event: H3Event, themeId: string) {
  const user = await requireAuthenticatedUser(event)
  const theme = await getThemeRecord(getDatabase(event), themeId, true)
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'Theme not found' })
  if (theme.owner_id !== user.githubId) {
    throw createError({ statusCode: 403, statusMessage: 'Only the original author can manage this theme' })
  }
  return { theme, user }
}

export async function requireAdministrator(event: H3Event) {
  const user = await requireAuthenticatedUser(event)
  const env = getCloudflareEnv(event) as Env & { ADMIN_GITHUB_IDS?: string }
  const adminIds = (env.ADMIN_GITHUB_IDS ?? process.env.ADMIN_GITHUB_IDS ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
  if (!adminIds.includes(String(user.githubId))) {
    throw createError({ statusCode: 403, statusMessage: 'Administrator access required' })
  }
  return user
}

export async function enforceRateLimit(
  event: H3Event,
  action: RateLimitAction,
  githubId?: number,
): Promise<void> {
  const userId = githubId ?? (await requireAuthenticatedUser(event)).githubId
  const limit = RATE_LIMITS[action]
  const allowed = await consumeRateLimit(getDatabase(event), userId, action, limit.maximum, limit.windowMs)
  if (!allowed) {
    const retryAfter = Math.ceil((limit.windowMs - Date.now() % limit.windowMs) / 1000)
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Please try again later.' })
  }
}
