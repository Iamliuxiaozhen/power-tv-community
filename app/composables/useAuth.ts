export function useAuth() {
  const route = useRoute()
  const { clear, fetch, loggedIn, ready, user } = useUserSession()

  function loginUrl(returnTo = route.fullPath): string {
    return `/auth/github?returnTo=${encodeURIComponent(returnTo)}`
  }

  async function logout(): Promise<void> {
    await clear()
    await navigateTo('/')
  }

  return { loggedIn, loginUrl, logout, ready, refresh: fetch, user }
}
