import { createError } from 'h3'
import type { ThemeDetailResponse } from '#shared/community'

export default defineEventHandler(async (event): Promise<ThemeDetailResponse> => {
  const themeId = requireThemeId(event)
  const db = getDatabase(event)
  const theme = await getThemeRecord(db, themeId)
  if (!theme) throw createError({ statusCode: 404, statusMessage: 'Theme not found' })

  return {
    theme: toThemeSummary(theme),
    versions: await listThemeVersions(db, themeId),
  }
})
