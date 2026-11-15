import { createError, readBody } from 'h3'
import { z } from 'zod'
import type { CreateReportResponse } from '#shared/community'

const reportSchema = z.object({
  targetType: z.enum(['theme', 'comment']),
  targetId: z.string().trim().min(1).max(128),
  reason: z.enum(['spam', 'malware', 'copyright', 'other']),
  details: z.string().trim().max(1000).optional(),
})

export default defineEventHandler(async (event): Promise<CreateReportResponse> => {
  const user = await requireAuthenticatedUser(event)
  const parsed = reportSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid report' })

  const db = getDatabase(event)
  await enforceRateLimit(event, 'report', user.githubId)
  try {
    const created = await createReport(db, {
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reporterId: user.githubId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? '',
    })
    if (!created) throw createError({ statusCode: 404, statusMessage: 'Report target not found' })
    setResponseStatus(event, 201)
    return created
  }
  catch (error) {
    if (error instanceof ReportRepositoryError && error.code === 'conflict') {
      throw createError({ statusCode: 409, statusMessage: 'A pending report already exists for this target' })
    }
    throw error
  }
})
