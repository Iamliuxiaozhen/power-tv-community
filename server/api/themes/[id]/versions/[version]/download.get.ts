export default defineEventHandler(async (event) => {
  const requestedVersion = requireThemeVersion(event)
  const { version } = await requirePublishedVersion(event, requestedVersion)
  return serveThemePackage(event, version, true)
})
