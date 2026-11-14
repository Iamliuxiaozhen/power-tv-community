import { localizedText } from '#shared/theme/validator'
import { compareVersions, parseVersion } from '#shared/theme/version'
import type { NormalizedThemeManifest, ValidatedThemePackage } from '#shared/theme/types'
import { removeThemeObjects, storeThemeObjects } from '../storage'
import { toThemeSummary, toVersionSummary, type ThemeWithOwnerRow, type VersionRow } from './types'

const THEME_SELECT = `
  SELECT t.*, u.login AS owner_login, u.display_name AS owner_display_name,
    u.avatar_url AS owner_avatar_url, u.github_url AS owner_github_url
  FROM themes t JOIN users u ON u.github_id = t.owner_id
`

export type ThemeSort = 'latest' | 'downloads' | 'likes'
export type ThemeRepositoryErrorCode = 'not_found' | 'forbidden' | 'conflict' | 'deleted'

export class ThemeRepositoryError extends Error {
  constructor(message: string, readonly code: ThemeRepositoryErrorCode) {
    super(message)
    this.name = 'ThemeRepositoryError'
  }
}

export interface ThemeListOptions {
  search?: string
  sort?: ThemeSort
  cursor?: string
  limit?: number
}

export async function listPublishedThemes(db: D1Database, options: ThemeListOptions) {
  return queryThemes(db, options)
}

export async function listOwnerThemes(db: D1Database, ownerId: number, includeUnpublished: boolean, options: ThemeListOptions = {}) {
  return queryThemes(db, options, ownerId, includeUnpublished)
}

async function queryThemes(db: D1Database, options: ThemeListOptions, ownerId?: number, includeUnpublished = false) {
  const sort = options.sort ?? 'latest'
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 50)
  const sortColumn = sort === 'downloads' ? 't.downloads' : sort === 'likes' ? 't.likes' : 't.created_at'
  const conditions: string[] = []
  const bindings: (string | number)[] = []

  if (!includeUnpublished) conditions.push(`t.status = 'published'`)
  else if (ownerId !== undefined) conditions.push(`t.status != 'deleted'`)
  if (ownerId !== undefined) {
    conditions.push('t.owner_id = ?')
    bindings.push(ownerId)
  }
  if (options.search?.trim()) {
    conditions.push(`t.search_text LIKE ? ESCAPE '\\'`)
    bindings.push(`%${escapeLike(options.search.trim().toLocaleLowerCase())}%`)
  }
  if (options.cursor) {
    const cursor = decodeCursor(options.cursor)
    conditions.push(`(${sortColumn} < ? OR (${sortColumn} = ? AND t.id < ?))`)
    bindings.push(cursor.value, cursor.value, cursor.id)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const result = await db.prepare(`
    ${THEME_SELECT} ${where}
    ORDER BY ${sortColumn} DESC, t.id DESC LIMIT ?
  `).bind(...bindings, limit + 1).all<ThemeWithOwnerRow>()
  const rows = result.results
  const page = rows.slice(0, limit)
  const last = page.at(-1)
  const cursorValue = last ? sort === 'downloads' ? last.downloads : sort === 'likes' ? last.likes : last.created_at : null

  return {
    items: page.map(toThemeSummary),
    nextCursor: rows.length > limit && last ? encodeCursor({ value: cursorValue!, id: last.id }) : null,
  }
}

export async function getThemeRecord(db: D1Database, id: string, includeUnpublished = false): Promise<ThemeWithOwnerRow | null> {
  return db.prepare(`${THEME_SELECT} WHERE t.id = ? ${includeUnpublished ? '' : `AND t.status = 'published'`}`)
    .bind(id).first<ThemeWithOwnerRow>()
}

export async function listThemeVersions(db: D1Database, themeId: string) {
  const result = await db.prepare('SELECT * FROM theme_versions WHERE theme_id = ? ORDER BY created_at DESC, version DESC')
    .bind(themeId).all<VersionRow>()
  return result.results.map(toVersionSummary).sort((left, right) => compareVersions(right.version, left.version))
}

export async function getVersionRecord(db: D1Database, themeId: string, version: string): Promise<VersionRow | null> {
  return db.prepare('SELECT * FROM theme_versions WHERE theme_id = ? AND version = ?')
    .bind(themeId, version).first<VersionRow>()
}

interface PublishThemeInput {
  ownerId: number
  fileName: string
  input: ValidatedThemePackage
  expectedThemeId?: string
}

export async function publishTheme(db: D1Database, bucket: R2Bucket, params: PublishThemeInput) {
  const manifest = params.input.manifest
  if (params.expectedThemeId && params.expectedThemeId !== manifest.id) {
    throw new ThemeRepositoryError('上传包的主题 ID 与更新目标不一致', 'conflict')
  }

  const existing = await getThemeRecord(db, manifest.id, true)
  if (existing && existing.owner_id !== params.ownerId) {
    throw new ThemeRepositoryError('只有原上传者可以更新此主题', 'forbidden')
  }
  if (existing?.status === 'deleted') {
    throw new ThemeRepositoryError('已删除的主题不能发布新版本', 'deleted')
  }

  const previousVersions = await db.prepare('SELECT version, major, minor, patch FROM theme_versions WHERE theme_id = ?')
    .bind(manifest.id).all<Pick<VersionRow, 'version' | 'major' | 'minor' | 'patch'>>()
  if (previousVersions.results.some(row => row.version === manifest.version)) {
    throw new ThemeRepositoryError('此版本已经发布，历史版本不可覆盖', 'conflict')
  }

  const stored = await storeThemeObjects(bucket, manifest.id, manifest.version, params.input)
  const now = new Date().toISOString()
  const version = parseVersion(manifest.version)
  const isLatest = !existing || previousVersions.results.every(row => compareVersions(manifest.version, row.version) > 0)
  const display = displayMetadata(manifest)
  const versionStatement = db.prepare(`
    INSERT INTO theme_versions (
      theme_id, version, major, minor, patch, original_filename, package_key,
      preview_key, preview_content_type, backdrop_key, backdrop_content_type,
      metadata_json, sha256, byte_size, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    manifest.id, manifest.version, ...version.parts, params.fileName, stored.packageKey,
    stored.previewKey, params.input.preview?.contentType ?? null,
    stored.backdropKey, params.input.backdrop?.contentType ?? null,
    JSON.stringify(manifest), params.input.sha256, params.input.byteSize, now,
  )

  const statements: D1PreparedStatement[] = [versionStatement]
  if (!existing) {
    statements.unshift(db.prepare(`
      INSERT INTO themes (
        id, owner_id, latest_version, latest_major, latest_minor, latest_patch,
        name, description, name_json, description_json, search_text,
        primary_color, dark_primary_color, surface_color, dark_surface_color,
        has_backdrop, backdrop_dim, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      manifest.id, params.ownerId, manifest.version, ...version.parts,
      display.name, display.description, display.nameJson, display.descriptionJson, display.searchText,
      display.primaryColor, display.darkPrimaryColor, display.surfaceColor, display.darkSurfaceColor,
      manifest.backdrop ? 1 : 0, manifest.backdrop?.dim ?? null, now, now,
    ))
  }
  else if (isLatest) {
    statements.push(db.prepare(`
      UPDATE themes SET latest_version = ?, latest_major = ?, latest_minor = ?, latest_patch = ?,
        name = ?, description = ?, name_json = ?, description_json = ?, search_text = ?,
        primary_color = ?, dark_primary_color = ?, surface_color = ?, dark_surface_color = ?,
        has_backdrop = ?, backdrop_dim = ?, updated_at = ? WHERE id = ?
    `).bind(
      manifest.version, ...version.parts, display.name, display.description, display.nameJson,
      display.descriptionJson, display.searchText, display.primaryColor, display.darkPrimaryColor,
      display.surfaceColor, display.darkSurfaceColor, manifest.backdrop ? 1 : 0,
      manifest.backdrop?.dim ?? null, now, manifest.id,
    ))
  }
  else {
    statements.push(db.prepare('UPDATE themes SET updated_at = ? WHERE id = ?').bind(now, manifest.id))
  }

  try {
    await db.batch(statements)
    return { themeId: manifest.id, version: manifest.version }
  }
  catch (error) {
    await removeThemeObjects(bucket, stored.keys)
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      throw new ThemeRepositoryError('主题 ID 或版本已经存在', 'conflict')
    }
    throw error
  }
}

export async function softDeleteTheme(db: D1Database, themeId: string, ownerId: number): Promise<boolean> {
  const result = await db.prepare(`UPDATE themes SET status = 'deleted', updated_at = ? WHERE id = ? AND owner_id = ? AND status != 'deleted'`)
    .bind(new Date().toISOString(), themeId, ownerId).run()
  return (result.meta.changes ?? 0) > 0
}

export async function incrementThemeDownloads(db: D1Database, themeId: string): Promise<void> {
  await db.prepare('UPDATE themes SET downloads = downloads + 1 WHERE id = ?').bind(themeId).run()
}

function displayMetadata(manifest: NormalizedThemeManifest) {
  const name = localizedText(manifest.name, manifest.id)
  const description = localizedText(manifest.description)
  const localizedValues = [manifest.name, manifest.description].flatMap(value => typeof value === 'string' ? [value] : Object.values(value ?? {}))
  return {
    name,
    description,
    nameJson: JSON.stringify(manifest.name),
    descriptionJson: manifest.description === undefined ? null : JSON.stringify(manifest.description),
    searchText: [manifest.id, name, description, ...localizedValues].join(' ').toLocaleLowerCase(),
    primaryColor: manifest.schemes.light.primary ?? manifest.seed ?? '#006A67',
    darkPrimaryColor: manifest.schemes.dark?.primary ?? manifest.schemes.light.primary ?? manifest.seed ?? '#006A67',
    surfaceColor: manifest.schemes.light.surface ?? '#F5FAF9',
    darkSurfaceColor: manifest.schemes.dark?.surface ?? '#0E1514',
  }
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

function encodeCursor(cursor: { value: string | number, id: string }): string {
  return btoa(JSON.stringify(cursor)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decodeCursor(value: string): { value: string | number, id: string } {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
    const cursor = JSON.parse(atob(normalized)) as { value?: string | number, id?: string }
    if ((typeof cursor.value !== 'string' && typeof cursor.value !== 'number') || typeof cursor.id !== 'string') {
      throw new Error('invalid cursor')
    }
    return { value: cursor.value, id: cursor.id }
  }
  catch {
    throw new ThemeRepositoryError('分页游标无效', 'conflict')
  }
}
