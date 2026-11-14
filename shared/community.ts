export interface CommunityUser {
  githubId: number
  login: string
  displayName: string | null
  avatarUrl: string
  githubUrl: string
}

export interface ThemeSummary {
  id: string
  name: string
  description: string
  version: string
  colors: {
    light: { primary: string, surface: string }
    dark: { primary: string, surface: string }
  }
  hasBackdrop: boolean
  backdropDim: number
  downloads: number
  likes: number
  owner: CommunityUser
  status: 'published' | 'hidden' | 'deleted'
  createdAt: string
  updatedAt: string
}

export interface ThemeListResponse {
  items: ThemeSummary[]
  nextCursor: string | null
}

export interface PublicUser extends CommunityUser {
  createdAt: string
}

export interface UserThemesResponse extends ThemeListResponse {
  user: PublicUser
}
