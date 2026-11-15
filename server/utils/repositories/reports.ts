import type {
  AdminReport,
  AdminReportListResponse,
  CreateReportResponse,
  ModerateReportResponse,
  ReportAction,
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from '#shared/community'

export type ReportRepositoryErrorCode = 'invalid_cursor' | 'not_found' | 'conflict'

export class ReportRepositoryError extends Error {
  constructor(message: string, readonly code: ReportRepositoryErrorCode) {
    super(message)
    this.name = 'ReportRepositoryError'
  }
}

interface CreateReportInput {
  targetType: ReportTargetType
  targetId: string
  reporterId: number
  reason: ReportReason
  details: string
}

interface AdminReportListOptions {
  status?: ReportStatus
  cursor?: string
  limit?: number
}

export async function createReport(db: D1Database, input: CreateReportInput): Promise<CreateReportResponse | null> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const targetCondition = input.targetType === 'theme'
    ? `EXISTS (SELECT 1 FROM themes WHERE id = ? AND status = 'published')`
    : `EXISTS (
        SELECT 1 FROM comments c JOIN themes t ON t.id = c.theme_id
        WHERE c.id = ? AND c.status = 'visible' AND t.status = 'published'
      )`

  try {
    const result = await db.prepare(`
      INSERT INTO reports (id, target_type, target_id, reporter_id, reason, details, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${targetCondition}
      RETURNING id, created_at
    `).bind(
      id, input.targetType, input.targetId, input.reporterId, input.reason, input.details, now, input.targetId,
    ).first<{ id: string, created_at: string }>()
    return result ? { id: result.id, status: 'pending', createdAt: result.created_at } : null
  }
  catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed: reports.reporter_id, reports.target_type, reports.target_id')) {
      throw new ReportRepositoryError('A pending report already exists for this target', 'conflict')
    }
    throw error
  }
}

interface AdminReportRow {
  id: string
  target_type: ReportTargetType
  target_id: string
  reason: ReportReason
  details: string
  status: ReportStatus
  created_at: string
  handled_at: string | null
  reporter_id: number
  reporter_login: string
  reporter_display_name: string | null
  reporter_avatar_url: string
  reporter_github_url: string
  handler_id: number | null
  handler_login: string | null
  handler_display_name: string | null
  handler_avatar_url: string | null
  handler_github_url: string | null
  theme_id: string
  theme_name: string
  theme_status: ModerationRecordRow['theme_status']
  theme_owner_id: number
  theme_owner_login: string
  theme_owner_display_name: string | null
  theme_owner_avatar_url: string
  theme_owner_github_url: string
  comment_id: string | null
  comment_body: string | null
  comment_status: ModerationRecordRow['comment_status']
  comment_created_at: string | null
  comment_author_id: number | null
  comment_author_login: string | null
  comment_author_display_name: string | null
  comment_author_avatar_url: string | null
  comment_author_github_url: string | null
}

export async function listAdminReports(db: D1Database, options: AdminReportListOptions = {}): Promise<AdminReportListResponse> {
  const status = options.status ?? 'pending'
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)
  const cursor = options.cursor ? decodeReportCursor(options.cursor) : null
  const bindings: (string | number)[] = [status]
  if (cursor) bindings.push(cursor.createdAt, cursor.createdAt, cursor.id)

  const result = await db.prepare(`
    SELECT r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at, r.handled_at,
      reporter.github_id AS reporter_id, reporter.login AS reporter_login,
      reporter.display_name AS reporter_display_name, reporter.avatar_url AS reporter_avatar_url,
      reporter.github_url AS reporter_github_url,
      handler.github_id AS handler_id, handler.login AS handler_login,
      handler.display_name AS handler_display_name, handler.avatar_url AS handler_avatar_url,
      handler.github_url AS handler_github_url,
      t.id AS theme_id, t.name AS theme_name, t.status AS theme_status, t.owner_id AS theme_owner_id,
      owner.login AS theme_owner_login, owner.display_name AS theme_owner_display_name,
      owner.avatar_url AS theme_owner_avatar_url, owner.github_url AS theme_owner_github_url,
      c.id AS comment_id, c.body AS comment_body, c.status AS comment_status, c.created_at AS comment_created_at,
      c.author_id AS comment_author_id, comment_author.login AS comment_author_login,
      comment_author.display_name AS comment_author_display_name,
      comment_author.avatar_url AS comment_author_avatar_url, comment_author.github_url AS comment_author_github_url
    FROM reports r
    JOIN users reporter ON reporter.github_id = r.reporter_id
    LEFT JOIN users handler ON handler.github_id = r.handled_by
    LEFT JOIN comments c ON r.target_type = 'comment' AND c.id = r.target_id
    JOIN themes t ON t.id = CASE WHEN r.target_type = 'theme' THEN r.target_id ELSE c.theme_id END
    JOIN users owner ON owner.github_id = t.owner_id
    LEFT JOIN users comment_author ON comment_author.github_id = c.author_id
    WHERE r.status = ?
      ${cursor ? 'AND (r.created_at > ? OR (r.created_at = ? AND r.id > ?))' : ''}
    ORDER BY r.created_at ASC, r.id ASC LIMIT ?
  `).bind(...bindings, limit + 1).all<AdminReportRow>()

  const page = result.results.slice(0, limit)
  const last = page.at(-1)
  return {
    items: page.map(toAdminReport),
    nextCursor: result.results.length > limit && last ? encodeReportCursor(last) : null,
  }
}

function toAdminReport(row: AdminReportRow): AdminReport {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.created_at,
    reporter: {
      githubId: row.reporter_id,
      login: row.reporter_login,
      displayName: row.reporter_display_name,
      avatarUrl: row.reporter_avatar_url,
      githubUrl: row.reporter_github_url,
    },
    handledBy: row.handler_id === null ? null : {
      githubId: row.handler_id,
      login: row.handler_login!,
      displayName: row.handler_display_name,
      avatarUrl: row.handler_avatar_url!,
      githubUrl: row.handler_github_url!,
    },
    handledAt: row.handled_at,
    theme: {
      id: row.theme_id,
      name: row.theme_name,
      status: row.theme_status!,
      owner: {
        githubId: row.theme_owner_id,
        login: row.theme_owner_login,
        displayName: row.theme_owner_display_name,
        avatarUrl: row.theme_owner_avatar_url,
        githubUrl: row.theme_owner_github_url,
      },
    },
    comment: row.target_type === 'theme' ? null : {
      id: row.comment_id!,
      body: row.comment_body!,
      status: row.comment_status!,
      createdAt: row.comment_created_at!,
      author: {
        githubId: row.comment_author_id!,
        login: row.comment_author_login!,
        displayName: row.comment_author_display_name,
        avatarUrl: row.comment_author_avatar_url!,
        githubUrl: row.comment_author_github_url!,
      },
    },
  }
}

function encodeReportCursor(row: Pick<AdminReportRow, 'id' | 'created_at'>): string {
  return btoa(JSON.stringify({ createdAt: row.created_at, id: row.id }))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decodeReportCursor(value: string): { createdAt: string, id: string } {
  try {
    const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
    const cursor = JSON.parse(atob(normalized)) as { createdAt?: string, id?: string }
    if (!cursor.createdAt || !cursor.id) throw new Error('invalid cursor')
    return { createdAt: cursor.createdAt, id: cursor.id }
  }
  catch {
    throw new ReportRepositoryError('Invalid report cursor', 'invalid_cursor')
  }
}

interface ModerationRecordRow {
  id: string
  target_type: ReportTargetType
  target_id: string
  status: ReportStatus
  theme_status: 'published' | 'hidden' | 'deleted' | null
  comment_status: 'visible' | 'hidden' | 'deleted' | null
}

export async function moderateReport(
  db: D1Database,
  id: string,
  action: ReportAction,
  handlerId: number,
): Promise<ModerateReportResponse> {
  const report = await getModerationRecord(db, id)
  const targetStatus = report.target_type === 'theme' ? report.theme_status! : report.comment_status!
  const now = new Date().toISOString()

  if (action === 'resolve' || action === 'dismiss') {
    if (report.status !== 'pending') throw new ReportRepositoryError('Only pending reports can be closed', 'conflict')
    const status = action === 'resolve' ? 'resolved' : 'dismissed'
    const result = await db.prepare(`
      UPDATE reports SET status = ?, handled_by = ?, handled_at = ?
      WHERE id = ? AND status = 'pending'
    `).bind(status, handlerId, now, id).run()
    if ((result.meta.changes ?? 0) !== 1) throw new ReportRepositoryError('Report was already moderated', 'conflict')
    return { id, status, targetStatus }
  }

  if (action === 'hide') {
    const expectedStatus = report.target_type === 'theme' ? 'published' : 'visible'
    if (report.status !== 'pending' || targetStatus !== expectedStatus) {
      throw new ReportRepositoryError('Report or target is not eligible for hiding', 'conflict')
    }
    const targetStatement = report.target_type === 'theme'
      ? db.prepare(`
          UPDATE themes SET status = 'hidden', updated_at = ?
          WHERE id = ? AND status = 'published' AND EXISTS (
            SELECT 1 FROM reports WHERE id = ? AND target_type = 'theme' AND target_id = ? AND status = 'pending'
          )
        `).bind(now, report.target_id, id, report.target_id)
      : db.prepare(`
          UPDATE comments SET status = 'hidden'
          WHERE id = ? AND status = 'visible' AND EXISTS (
            SELECT 1 FROM reports WHERE id = ? AND target_type = 'comment' AND target_id = ? AND status = 'pending'
          )
        `).bind(report.target_id, id, report.target_id)
    const reportsStatement = db.prepare(`
      UPDATE reports SET status = 'resolved', handled_by = ?, handled_at = ?
      WHERE target_type = ? AND target_id = ? AND status = 'pending' AND (SELECT changes()) = 1
    `).bind(handlerId, now, report.target_type, report.target_id)
    const [targetResult, reportsResult] = await db.batch([targetStatement, reportsStatement])
    if ((targetResult?.meta.changes ?? 0) !== 1 || (reportsResult?.meta.changes ?? 0) < 1) {
      throw new ReportRepositoryError('Report or target was already moderated', 'conflict')
    }
    return { id, status: 'resolved', targetStatus: 'hidden' }
  }

  if (report.status !== 'resolved' || targetStatus !== 'hidden') {
    throw new ReportRepositoryError('Only resolved reports for hidden targets can be restored', 'conflict')
  }
  const targetStatement = report.target_type === 'theme'
    ? db.prepare(`
        UPDATE themes SET status = 'published', updated_at = ?
        WHERE id = ? AND status = 'hidden' AND EXISTS (
          SELECT 1 FROM reports WHERE id = ? AND target_type = 'theme' AND target_id = ? AND status = 'resolved'
        )
      `).bind(now, report.target_id, id, report.target_id)
    : db.prepare(`
        UPDATE comments SET status = 'visible'
        WHERE id = ? AND status = 'hidden' AND EXISTS (
          SELECT 1 FROM reports WHERE id = ? AND target_type = 'comment' AND target_id = ? AND status = 'resolved'
        )
      `).bind(report.target_id, id, report.target_id)
  const reportStatement = db.prepare(`
    UPDATE reports SET handled_by = ?, handled_at = ?
    WHERE id = ? AND status = 'resolved' AND (SELECT changes()) = 1
  `).bind(handlerId, now, id)
  const [targetResult, reportResult] = await db.batch([targetStatement, reportStatement])
  if ((targetResult?.meta.changes ?? 0) !== 1 || (reportResult?.meta.changes ?? 0) !== 1) {
    throw new ReportRepositoryError('Report or target was already moderated', 'conflict')
  }
  return { id, status: 'resolved', targetStatus: report.target_type === 'theme' ? 'published' : 'visible' }
}

async function getModerationRecord(db: D1Database, id: string): Promise<ModerationRecordRow> {
  const report = await db.prepare(`
    SELECT r.id, r.target_type, r.target_id, r.status,
      t.status AS theme_status, c.status AS comment_status
    FROM reports r
    LEFT JOIN comments c ON r.target_type = 'comment' AND c.id = r.target_id
    LEFT JOIN themes t ON t.id = CASE WHEN r.target_type = 'theme' THEN r.target_id ELSE c.theme_id END
    WHERE r.id = ?
  `).bind(id).first<ModerationRecordRow>()
  if (!report || !report.theme_status || (report.target_type === 'comment' && !report.comment_status)) {
    throw new ReportRepositoryError('Report or target not found', 'not_found')
  }
  return report
}
