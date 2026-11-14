export default defineEventHandler(async (event) => {
  const { version } = await requirePublishedVersion(event)
  return serveThemePackage(event, version, false)
})
