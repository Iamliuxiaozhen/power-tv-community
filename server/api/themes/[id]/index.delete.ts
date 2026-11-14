export default defineEventHandler(async (event) => {
  const themeId = requireThemeId(event)
  const { user } = await requireThemeAuthor(event, themeId)
  await softDeleteTheme(getDatabase(event), themeId, user.githubId)
  return { deleted: true }
})
