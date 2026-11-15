import { createError, getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id || !/^[\w-]{1,64}$/.test(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid comment ID' })
  const user = await requireAuthenticatedUser(event)
  const deleted = await deleteOwnComment(getDatabase(event), id, user.githubId)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  return { deleted: true }
})
