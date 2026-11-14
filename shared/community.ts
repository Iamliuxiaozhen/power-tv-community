import type { NormalizedThemeManifest } from './theme/types'

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

export interface ThemeVersionSummary {
  version: string
  fileName: string
  sha256: string
  byteSize: number
  createdAt: string
  metadata: NormalizedThemeManifest
  hasPreview: boolean
  hasBackdrop: boolean
}

export interface ThemeDetailResponse {
  theme: ThemeSummary
  versions: ThemeVersionSummary[]
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
