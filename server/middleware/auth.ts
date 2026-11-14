import { safeReturnTo } from '#shared/security'

export const AUTH_RETURN_COOKIE = 'power_tv_auth_return'

export default defineEventHandler((event) => {
  if (event.path !== '/auth/github') return
  const query = getQuery(event)
  if (query.code || query.error) return

  setCookie(event, AUTH_RETURN_COOKIE, safeReturnTo(query.returnTo), {
    httpOnly: true,
    maxAge: 60 * 10,
    path: '/auth/github',
    sameSite: 'lax',
    secure: (process.env.NUXT_APP_URL ?? '').startsWith('https://'),
  })
})
