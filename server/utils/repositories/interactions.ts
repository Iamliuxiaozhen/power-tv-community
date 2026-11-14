import type { DashboardStats } from '#shared/community'
import { toThemeSummary, type ThemeWithOwnerRow } from './types'

type Reaction = 'likes' | 'favorites'

export async function setThemeReaction(db: D1Database, userId: number, themeId: string, reaction: Reaction, active: boolean): Promise<void> {
  const now = new Date().toISOString()
  if (active) {
    const statements: D1PreparedStatement[] = [db.prepare(`
      INSERT INTO ${reaction} (user_id, theme_id, created_at)
      SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM themes WHERE id = ? AND status = 'published')
      ON CONFLICT(user_id, theme_id) DO NOTHING
    `).bind(userId, themeId, now, themeId)]
    if (reaction === 'likes') {
      statements.push(db.prepare('UPDATE themes SET likes = likes + (SELECT changes()) WHERE id = ?').bind(themeId))
    }
    await db.batch(statements)
    return
  }

  const statements: D1PreparedStatement[] = [db.prepare(`DELETE FROM ${reaction} WHERE user_id = ? AND theme_id = ?`).bind(userId, themeId)]
  if (reaction === 'likes') {
    statements.push(db.prepare('UPDATE themes SET likes = MAX(0, likes - (SELECT changes())) WHERE id = ?').bind(themeId))
  }
  await db.batch(statements)
}

export async function getReactionState(db: D1Database, userId: number, themeId: string) {
  const [liked, favorited] = await db.batch([
    db.prepare('SELECT 1 AS value FROM likes WHERE user_id = ? AND theme_id = ?').bind(userId, themeId),
    db.prepare('SELECT 1 AS value FROM favorites WHERE user_id = ? AND theme_id = ?').bind(userId, themeId),
  ])
  return { liked: Boolean(liked?.results[0]), favorited: Boolean(favorited?.results[0]) }
}

export async function listReactedThemes(db: D1Database, userId: number, reaction: Reaction) {
  const result = await db.prepare(`
    SELECT t.*, u.login AS owner_login, u.display_name AS owner_display_name,
      u.avatar_url AS owner_avatar_url, u.github_url AS owner_github_url
    FROM ${reaction} r
    JOIN themes t ON t.id = r.theme_id AND t.status = 'published'
    JOIN users u ON u.github_id = t.owner_id
    WHERE r.user_id = ? ORDER BY r.created_at DESC, t.id DESC LIMIT 100
  `).bind(userId).all<ThemeWithOwnerRow>()
  return result.results.map(toThemeSummary)
}

export async function getDashboardStats(db: D1Database, userId: number): Promise<DashboardStats> {
  const [owned, favorites] = await db.batch([
    db.prepare(`
      SELECT COUNT(*) AS themes, COALESCE(SUM(downloads), 0) AS downloads,
        COALESCE(SUM(likes), 0) AS likes
      FROM themes WHERE owner_id = ? AND status != 'deleted'
    `).bind(userId),
    db.prepare(`
      SELECT COUNT(*) AS favorites FROM favorites f
      JOIN themes t ON t.id = f.theme_id AND t.status = 'published'
      WHERE f.user_id = ?
    `).bind(userId),
  ])
  const totals = owned?.results[0] as { themes: number, downloads: number, likes: number } | undefined
  const favoriteTotal = favorites?.results[0] as { favorites: number } | undefined
  return {
    themes: Number(totals?.themes ?? 0),
    favorites: Number(favoriteTotal?.favorites ?? 0),
    downloads: Number(totals?.downloads ?? 0),
    likes: Number(totals?.likes ?? 0),
  }
}

export async function listComments(db: D1Database, themeId: string, cursor?: string, limit = 30) {
  const pageSize = Math.min(Math.max(limit, 1), 50)
  const decoded = cursor ? decodeCommentCursor(cursor) : null
  const bindings: string[] = decoded
    ? [themeId, decoded.createdAt, decoded.createdAt, decoded.id]
    : [themeId]
  const result = await db.prepare(`
    SELECT c.id, c.body, c.status, c.created_at, c.author_id,
      u.login, u.display_name, u.avatar_url, u.github_url
    FROM comments c JOIN users u ON u.github_id = c.author_id
    WHERE c.theme_id = ? ${decoded ? 'AND (c.created_at < ? OR (c.created_at = ? AND c.id < ?))' : ''}
    ORDER BY c.created_at DESC, c.id DESC LIMIT ?
  `).bind(...bindings, pageSize + 1).all<CommentRow>()
  const page = result.results.slice(0, pageSize)
  const last = page.at(-1)
  return {
    items: page.map(row => ({
      id: row.id,
      body: row.status === 'visible' ? row.body : null,
      status: row.status,
      createdAt: row.created_at,
      author: {
        githubId: row.author_id,
        login: row.login,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        githubUrl: row.github_url,
      },
    })),
    nextCursor: result.results.length > pageSize && last ? encodeCommentCursor(last) : null,
  }
}

interface CommentRow {
  id: string
  body: string
  status: 'visible' | 'hidden' | 'deleted'
  created_at: string
  author_id: number
  login: string
  display_name: string | null
  avatar_url: string
  github_url: string
}

function encodeCommentCursor(row: Pick<CommentRow, 'id' | 'created_at'>): string {
  return btoa(JSON.stringify({ id: row.id, createdAt: row.created_at }))
}

function decodeCommentCursor(value: string): { id: string, createdAt: string } {
  try {
    const cursor = JSON.parse(atob(value)) as { id?: string, createdAt?: string }
    if (!cursor.id || !cursor.createdAt) throw new Error('invalid cursor')
    return { id: cursor.id, createdAt: cursor.createdAt }
  }
  catch {
    throw new Error('评论分页游标无效')
  }
}

export async function addComment(db: D1Database, themeId: string, authorId: number, body: string): Promise<string | null> {
  const id = crypto.randomUUID()
  const result = await db.prepare(`
    INSERT INTO comments (id, theme_id, author_id, body, created_at)
    SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM themes WHERE id = ? AND status = 'published')
  `).bind(id, themeId, authorId, body, new Date().toISOString(), themeId).run()
  return (result.meta.changes ?? 0) > 0 ? id : null
}

export async function deleteOwnComment(db: D1Database, id: string, authorId: number): Promise<boolean> {
  const result = await db.prepare(`
    UPDATE comments SET status = 'deleted', deleted_at = ? WHERE id = ? AND author_id = ? AND status = 'visible'
  `).bind(new Date().toISOString(), id, authorId).run()
  return (result.meta.changes ?? 0) > 0
}
