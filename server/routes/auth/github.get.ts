import { deleteCookie, getCookie, sendRedirect } from 'nuxt/server'
import type { H3Event } from 'h3'
import { safeReturnTo } from '#shared/security'
import { AUTH_RETURN_COOKIE } from '../../middleware/auth'

const COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/auth/github',
  sameSite: 'lax' as const,
  secure: (process.env.NUXT_APP_URL ?? '').startsWith('https://'),
}

export default defineOAuthGitHubEventHandler({
  config: {
    redirectURL: new URL('/auth/github', process.env.NUXT_APP_URL ?? 'http://localhost:3000').toString(),
    scope: [],
  },
  async onSuccess(event, { user }) {
    const returnTo = safeReturnTo(getCookie(event, AUTH_RETURN_COOKIE))
    deleteCookie(event, AUTH_RETURN_COOKIE, COOKIE_OPTIONS)

    const profile = {
      githubId: user.id,
      login: user.login,
      displayName: user.name || null,
      avatarUrl: user.avatar_url,
      githubUrl: user.html_url,
    }
    await upsertGitHubUser(getDatabase(event as unknown as H3Event), profile)
    await writeUserSession(event as unknown as H3Event, {
      user: profile,
      loggedInAt: new Date().toISOString(),
    })
    return sendRedirect(event, returnTo)
  },
  onError(event) {
    deleteCookie(event, AUTH_RETURN_COOKIE, COOKIE_OPTIONS)
    return sendRedirect(event, '/?authError=github')
  },
})
