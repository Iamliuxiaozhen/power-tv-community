import { createError, getQuery } from 'h3'
import { z } from 'zod'
import type { AdminReportListResponse } from '#shared/community'

const listQuerySchema = z.object({
  status: z.enum(['pending', 'resolved', 'dismissed']).default('pending'),
  cursor: z.string().regex(/^[\w-]+$/).max(2048).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export default defineEventHandler(async (event): Promise<AdminReportListResponse> => {
  await requireAdministrator(event)
  const parsed = listQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid report query' })

  try {
    return await listAdminReports(getDatabase(event), {
      status: parsed.data.status,
      ...(parsed.data.cursor ? { cursor: parsed.data.cursor } : {}),
      limit: parsed.data.limit,
    })
  }
  catch (error) {
    if (error instanceof ReportRepositoryError && error.code === 'invalid_cursor') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid report cursor' })
    }
    throw error
  }
})
