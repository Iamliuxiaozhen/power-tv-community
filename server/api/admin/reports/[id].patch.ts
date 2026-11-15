import { createError, getRouterParam, readBody } from 'h3'
import { z } from 'zod'
import type { ModerateReportResponse } from '#shared/community'

const moderationSchema = z.object({
  action: z.enum(['resolve', 'dismiss', 'hide', 'restore']),
})

export default defineEventHandler(async (event): Promise<ModerateReportResponse> => {
  const administrator = await requireAdministrator(event)
  const id = getRouterParam(event, 'id')
  if (!id || !/^[\w-]{1,64}$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid report ID' })
  const parsed = moderationSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid moderation action' })

  try {
    return await moderateReport(getDatabase(event), id, parsed.data.action, administrator.githubId)
  }
  catch (error) {
    if (error instanceof ReportRepositoryError) {
      if (error.code === 'not_found') {
        throw createError({ statusCode: 404, statusMessage: 'Report or target not found' })
      }
      if (error.code === 'conflict') {
        throw createError({ statusCode: 409, statusMessage: 'Report or target cannot be moderated in its current state' })
      }
    }
    throw error
  }
})
