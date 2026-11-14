declare module '#auth-utils' {
  interface User {
    githubId: number
    login: string
    displayName: string | null
    avatarUrl: string
    githubUrl: string
  }

  interface UserSession {
    loggedInAt?: string
  }
}

export {}
