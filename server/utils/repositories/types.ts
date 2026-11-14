import type { ThemeSummary, ThemeVersionSummary } from '#shared/community'
import type { NormalizedThemeManifest } from '#shared/theme/types'

export interface ThemeRow {
  id: string
  owner_id: number
  latest_version: string
  latest_major: string
  latest_minor: string
  latest_patch: string
  name: string
  description: string
  name_json: string
  description_json: string | null
  search_text: string
  primary_color: string
  dark_primary_color: string
  surface_color: string
  dark_surface_color: string
  has_backdrop: number
  backdrop_dim: number | null
  status: 'published' | 'hidden' | 'deleted'
  downloads: number
  likes: number
  created_at: string
  updated_at: string
}

export interface ThemeWithOwnerRow extends ThemeRow {
  owner_login: string
  owner_display_name: string | null
  owner_avatar_url: string
  owner_github_url: string
}

export interface VersionRow {
  theme_id: string
  version: string
  major: string
  minor: string
  patch: string
  original_filename: string
  package_key: string
  preview_key: string | null
  preview_content_type: string | null
  backdrop_key: string | null
  backdrop_content_type: string | null
  metadata_json: string
  sha256: string
  byte_size: number
  created_at: string
}

export function toThemeSummary(row: ThemeWithOwnerRow): ThemeSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.latest_version,
    colors: {
      light: { primary: row.primary_color, surface: row.surface_color },
      dark: { primary: row.dark_primary_color, surface: row.dark_surface_color },
    },
    hasBackdrop: row.has_backdrop === 1,
    backdropDim: row.backdrop_dim ?? 0,
    downloads: row.downloads,
    likes: row.likes,
    owner: {
      githubId: row.owner_id,
      login: row.owner_login,
      displayName: row.owner_display_name,
      avatarUrl: row.owner_avatar_url,
      githubUrl: row.owner_github_url,
    },
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toVersionSummary(row: VersionRow): ThemeVersionSummary {
  return {
    version: row.version,
    fileName: row.original_filename,
    sha256: row.sha256,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    metadata: JSON.parse(row.metadata_json) as NormalizedThemeManifest,
    hasPreview: Boolean(row.preview_key),
    hasBackdrop: Boolean(row.backdrop_key),
  }
}
