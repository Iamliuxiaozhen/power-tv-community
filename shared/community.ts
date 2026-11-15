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

export interface ThemeReactionState {
  liked: boolean
  favorited: boolean
}

export interface ThemeReactionResponse extends ThemeReactionState {
  likes: number
}

export interface ThemeDetailResponse {
  theme: ThemeSummary
  versions: ThemeVersionSummary[]
  viewer: ThemeReactionState
}

export interface PublishThemeResponse {
  themeId: string
  version: string
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

export interface CommunityComment {
  id: string
  body: string | null
  status: 'visible' | 'hidden' | 'deleted'
  createdAt: string
  author: CommunityUser
}

export interface CommentListResponse {
  items: CommunityComment[]
  nextCursor: string | null
}

export interface DashboardStats {
  themes: number
  favorites: number
  downloads: number
  likes: number
}

export interface DashboardResponse {
  themes: ThemeListResponse
  liked: ThemeSummary[]
  favorites: ThemeSummary[]
  stats: DashboardStats
}

export type ReportReason = 'spam' | 'malware' | 'copyright' | 'other'
export type ReportStatus = 'pending' | 'resolved' | 'dismissed'
export type ReportTargetType = 'theme' | 'comment'
export type ReportAction = 'resolve' | 'dismiss' | 'hide' | 'restore'

export interface ModerationTheme {
  id: string
  name: string
  status: ThemeSummary['status']
  owner: CommunityUser
}

export interface ModerationComment {
  id: string
  body: string
  status: CommunityComment['status']
  createdAt: string
  author: CommunityUser
}

export interface AdminReport {
  id: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details: string
  status: ReportStatus
  createdAt: string
  reporter: CommunityUser
  handledBy: CommunityUser | null
  handledAt: string | null
  theme: ModerationTheme
  comment: ModerationComment | null
}

export interface AdminReportListResponse {
  items: AdminReport[]
  nextCursor: string | null
}

export interface CreateReportResponse {
  id: string
  status: 'pending'
  createdAt: string
}

export interface ModerateReportResponse {
  id: string
  status: ReportStatus
  targetStatus: ThemeSummary['status'] | CommunityComment['status']
}
