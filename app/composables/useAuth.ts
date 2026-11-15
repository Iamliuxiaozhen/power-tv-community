export function useAuth() {
  const route = useRoute()
  const { fetch, loggedIn, ready, user } = useUserSession()

  function loginUrl(returnTo = route.fullPath): string {
    return `/auth/github?returnTo=${encodeURIComponent(returnTo)}`
  }

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await fetch()
    await navigateTo('/')
  }

  return { loggedIn, loginUrl, logout, ready, refresh: fetch, user }
}
