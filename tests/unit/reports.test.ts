import { describe, expect, it, vi } from 'vitest'
import {
  createReport,
  listAdminReports,
  moderateReport,
} from '../../server/utils/repositories/reports'

interface FakeStatement {
  sql: string
  bindings: unknown[]
  bind: (...bindings: unknown[]) => FakeStatement
  first: () => Promise<unknown>
  all: () => Promise<{ results: unknown[] }>
  run: () => Promise<{ meta: { changes: number } }>
}

interface FakeDatabaseOptions {
  first?: unknown
  firstError?: Error
  rows?: unknown[]
  runChanges?: number
  batchChanges?: number[]
}

function fakeDatabase(options: FakeDatabaseOptions = {}) {
  const statements: FakeStatement[] = []
  const prepare = vi.fn((sql: string): FakeStatement => ({
    sql,
    bindings: [],
    bind(...bindings: unknown[]) {
      this.bindings = bindings
      statements.push(this)
      return this
    },
    async first() {
      if (options.firstError) throw options.firstError
      return options.first ?? null
    },
    async all() {
      return { results: options.rows ?? [] }
    },
    async run() {
      return { meta: { changes: options.runChanges ?? 0 } }
    },
  }))
  const batch = vi.fn().mockResolvedValue(
    (options.batchChanges ?? []).map(changes => ({ meta: { changes } })),
  )
  return { db: { prepare, batch } as unknown as D1Database, prepare, batch, statements }
}

function adminReportRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-theme',
    target_type: 'theme',
    target_id: 'user.ocean',
    reason: 'spam',
    details: 'Report details',
    status: 'resolved',
    created_at: '2026-11-14T01:00:00.000Z',
    handled_at: null,
    reporter_id: 7,
    reporter_login: 'reporter',
    reporter_display_name: 'Reporter',
    reporter_avatar_url: 'https://avatars.githubusercontent.com/u/7',
    reporter_github_url: 'https://github.com/reporter',
    handler_id: null,
    handler_login: null,
    handler_display_name: null,
    handler_avatar_url: null,
    handler_github_url: null,
    theme_id: 'user.ocean',
    theme_name: 'Ocean',
    theme_status: 'published',
    theme_owner_id: 8,
    theme_owner_login: 'owner',
    theme_owner_display_name: 'Theme Owner',
    theme_owner_avatar_url: 'https://avatars.githubusercontent.com/u/8',
    theme_owner_github_url: 'https://github.com/owner',
    comment_id: null,
    comment_body: null,
    comment_status: null,
    comment_created_at: null,
    comment_author_id: null,
    comment_author_login: null,
    comment_author_display_name: null,
    comment_author_avatar_url: null,
    comment_author_github_url: null,
    ...overrides,
  }
}

function moderationRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    target_type: 'theme',
    target_id: 'target-1',
    status: 'pending',
    theme_status: 'published',
    comment_status: null,
    ...overrides,
  }
}

function decodeCursor(cursor: string) {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { createdAt: string, id: string }
}

describe('report creation', () => {
  it('inserts a theme report only while the theme is published', async () => {
    const createdAt = '2026-11-15T01:00:00.000Z'
    const { db, statements } = fakeDatabase({ first: { id: 'report-1', created_at: createdAt } })

    await expect(createReport(db, {
      targetType: 'theme',
      targetId: 'user.ocean',
      reporterId: 7,
      reason: 'spam',
      details: '',
    })).resolves.toEqual({ id: 'report-1', status: 'pending', createdAt })

    expect(statements).toHaveLength(1)
    expect(statements[0]?.sql).toContain('INSERT INTO reports')
    expect(statements[0]?.sql).toContain("FROM themes WHERE id = ? AND status = 'published'")
    expect(statements[0]?.bindings).toEqual([
      expect.any(String), 'theme', 'user.ocean', 7, 'spam', '', expect.any(String), 'user.ocean',
    ])
  })

  it('inserts a comment report only while the comment and parent theme are reportable', async () => {
    const { db, statements } = fakeDatabase({
      first: { id: 'report-2', created_at: '2026-11-15T01:01:00.000Z' },
    })

    await createReport(db, {
      targetType: 'comment',
      targetId: 'comment-1',
      reporterId: 7,
      reason: 'copyright',
      details: 'Original source omitted',
    })

    expect(statements[0]?.sql).toContain('FROM comments c JOIN themes t ON t.id = c.theme_id')
    expect(statements[0]?.sql).toContain("c.status = 'visible' AND t.status = 'published'")
    expect(statements[0]?.bindings).toEqual([
      expect.any(String), 'comment', 'comment-1', 7, 'copyright', 'Original source omitted',
      expect.any(String), 'comment-1',
    ])
  })

  it('returns null when the conditional insert finds no valid target', async () => {
    const { db, statements } = fakeDatabase()
    await expect(createReport(db, {
      targetType: 'comment',
      targetId: 'deleted-comment',
      reporterId: 7,
      reason: 'other',
      details: '',
    })).resolves.toBeNull()
    expect(statements[0]?.sql).toContain('RETURNING id, created_at')
  })

  it('maps only the pending-report unique conflict to a repository conflict', async () => {
    const duplicate = fakeDatabase({
      firstError: new Error('D1_ERROR: UNIQUE constraint failed: reports.reporter_id, reports.target_type, reports.target_id'),
    })
    await expect(createReport(duplicate.db, {
      targetType: 'theme', targetId: 'user.ocean', reporterId: 7, reason: 'spam', details: '',
    })).rejects.toMatchObject({ name: 'ReportRepositoryError', code: 'conflict' })

    const primaryKeyError = new Error('D1_ERROR: UNIQUE constraint failed: reports.id')
    const unrelated = fakeDatabase({ firstError: primaryKeyError })
    await expect(createReport(unrelated.db, {
      targetType: 'theme', targetId: 'user.ocean', reporterId: 7, reason: 'spam', details: '',
    })).rejects.toBe(primaryKeyError)
  })
})

describe('admin report listing', () => {
  it('maps reporter, handler, theme, owner and original comment context with a stable cursor', async () => {
    const themeRow = adminReportRow({ created_at: '2026-11-14T00:00:00.000Z' })
    const commentRow = adminReportRow({
      id: 'report-comment',
      target_type: 'comment',
      target_id: 'comment-1',
      reason: 'malware',
      created_at: '2026-11-14T01:00:00.000Z',
      handled_at: '2026-11-14T02:00:00.000Z',
      handler_id: 99,
      handler_login: 'admin',
      handler_display_name: 'Administrator',
      handler_avatar_url: 'https://avatars.githubusercontent.com/u/99',
      handler_github_url: 'https://github.com/admin',
      theme_status: 'hidden',
      comment_id: 'comment-1',
      comment_body: 'original deleted body',
      comment_status: 'deleted',
      comment_created_at: '2026-11-13T01:00:00.000Z',
      comment_author_id: 10,
      comment_author_login: 'commenter',
      comment_author_display_name: 'Comment Author',
      comment_author_avatar_url: 'https://avatars.githubusercontent.com/u/10',
      comment_author_github_url: 'https://github.com/commenter',
    })
    const extraRow = adminReportRow({ id: 'report-extra', created_at: '2026-11-14T03:00:00.000Z' })
    const { db, statements } = fakeDatabase({ rows: [themeRow, commentRow, extraRow] })

    const page = await listAdminReports(db, { status: 'resolved', limit: 2 })

    expect(page.items).toHaveLength(2)
    expect(page.items[0]).toMatchObject({
      id: 'report-theme',
      targetType: 'theme',
      reporter: { githubId: 7, login: 'reporter' },
      handledBy: null,
      theme: { id: 'user.ocean', name: 'Ocean', owner: { githubId: 8, login: 'owner' } },
      comment: null,
    })
    expect(page.items[1]).toMatchObject({
      id: 'report-comment',
      targetType: 'comment',
      handledBy: { githubId: 99, login: 'admin' },
      handledAt: '2026-11-14T02:00:00.000Z',
      theme: { id: 'user.ocean', status: 'hidden' },
      comment: {
        id: 'comment-1',
        body: 'original deleted body',
        status: 'deleted',
        author: { githubId: 10, login: 'commenter' },
      },
    })
    expect(statements[0]?.sql).toContain('LEFT JOIN users handler ON handler.github_id = r.handled_by')
    expect(statements[0]?.sql).toContain('ORDER BY r.created_at ASC, r.id ASC LIMIT ?')
    expect(statements[0]?.bindings).toEqual(['resolved', 3])
    expect(page.nextCursor).not.toBeNull()
    expect(decodeCursor(page.nextCursor!)).toEqual({
      createdAt: '2026-11-14T01:00:00.000Z',
      id: 'report-comment',
    })

    const next = fakeDatabase()
    await listAdminReports(next.db, { cursor: page.nextCursor! })
    expect(next.statements[0]?.sql).toContain('r.created_at > ? OR (r.created_at = ? AND r.id > ?)')
    expect(next.statements[0]?.bindings).toEqual([
      'pending', '2026-11-14T01:00:00.000Z', '2026-11-14T01:00:00.000Z', 'report-comment', 21,
    ])
  })

  it('rejects malformed cursors without querying the database', async () => {
    const { db, prepare } = fakeDatabase()
    await expect(listAdminReports(db, { cursor: 'not-base64' })).rejects.toMatchObject({ code: 'invalid_cursor' })
    expect(prepare).not.toHaveBeenCalled()
  })
})

describe('report moderation', () => {
  it.each([
    ['resolve', 'resolved'],
    ['dismiss', 'dismissed'],
  ] as const)('%s closes only a pending report without changing its target', async (action, status) => {
    const { db, statements, batch } = fakeDatabase({ first: moderationRecord(), runChanges: 1 })
    await expect(moderateReport(db, 'report-1', action, 99)).resolves.toEqual({
      id: 'report-1', status, targetStatus: 'published',
    })

    expect(statements).toHaveLength(2)
    expect(statements[1]?.sql).toContain('UPDATE reports SET status = ?, handled_by = ?, handled_at = ?')
    expect(statements[1]?.sql).toContain("WHERE id = ? AND status = 'pending'")
    expect(statements[1]?.bindings).toEqual([status, 99, expect.any(String), 'report-1'])
    expect(statements[1]?.sql).not.toContain('UPDATE themes')
    expect(batch).not.toHaveBeenCalled()
  })

  it('checks meta.changes so a repeated close cannot report success', async () => {
    const { db } = fakeDatabase({ first: moderationRecord(), runChanges: 0 })
    await expect(moderateReport(db, 'report-1', 'resolve', 99)).rejects.toMatchObject({ code: 'conflict' })
  })

  it.each([
    ['theme', null, 'UPDATE themes', "status = 'published'"],
    ['comment', 'visible', 'UPDATE comments', "status = 'visible'"],
  ] as const)('hide resolves every pending report for a %s target in one batch', async (targetType, commentStatus, updateSql, expectedStatus) => {
    const { db, statements, batch } = fakeDatabase({
      first: moderationRecord({ target_type: targetType, comment_status: commentStatus }),
      batchChanges: [1, 3],
    })

    await expect(moderateReport(db, 'report-1', 'hide', 99)).resolves.toEqual({
      id: 'report-1', status: 'resolved', targetStatus: 'hidden',
    })

    expect(batch).toHaveBeenCalledOnce()
    expect(statements).toHaveLength(3)
    expect(statements[1]?.sql).toContain(updateSql)
    expect(statements[1]?.sql).toContain(expectedStatus)
    expect(statements[1]?.sql).toContain("status = 'pending'")
    expect(statements[1]?.bindings).toEqual(targetType === 'theme'
      ? [expect.any(String), 'target-1', 'report-1', 'target-1']
      : ['target-1', 'report-1', 'target-1'])
    expect(statements[2]?.sql).toContain("WHERE target_type = ? AND target_id = ? AND status = 'pending' AND (SELECT changes()) = 1")
    expect(statements[2]?.bindings).toEqual([99, expect.any(String), targetType, 'target-1'])
  })

  it('rejects a hide batch when its conditional target update changes no rows', async () => {
    const { db } = fakeDatabase({ first: moderationRecord(), batchChanges: [0, 0] })
    await expect(moderateReport(db, 'report-1', 'hide', 99)).rejects.toMatchObject({ code: 'conflict' })
  })

  it.each([
    ['theme', null, 'UPDATE themes', 'published'],
    ['comment', 'hidden', 'UPDATE comments', 'visible'],
  ] as const)('restore returns a hidden %s to its visible state and keeps the report resolved', async (targetType, commentStatus, updateSql, targetStatus) => {
    const { db, statements, batch } = fakeDatabase({
      first: moderationRecord({ target_type: targetType, status: 'resolved', theme_status: 'hidden', comment_status: commentStatus }),
      batchChanges: [1, 1],
    })

    await expect(moderateReport(db, 'report-1', 'restore', 99)).resolves.toEqual({
      id: 'report-1', status: 'resolved', targetStatus,
    })

    expect(batch).toHaveBeenCalledOnce()
    expect(statements[1]?.sql).toContain(updateSql)
    expect(statements[1]?.sql).toContain("status = 'hidden'")
    expect(statements[1]?.sql).toContain("status = 'resolved'")
    expect(statements[2]?.sql).toContain('UPDATE reports SET handled_by = ?, handled_at = ?')
    expect(statements[2]?.sql).toContain("WHERE id = ? AND status = 'resolved' AND (SELECT changes()) = 1")
    expect(statements[2]?.sql).not.toContain('SET status =')
    expect(statements[2]?.bindings).toEqual([99, expect.any(String), 'report-1'])
  })

  it.each([
    ['hide', 'pending', 'deleted'],
    ['hide', 'resolved', 'published'],
    ['restore', 'pending', 'hidden'],
    ['restore', 'dismissed', 'hidden'],
    ['restore', 'resolved', 'deleted'],
  ] as const)('rejects %s for report status %s and target status %s', async (action, reportStatus, targetStatus) => {
    const { db, batch, statements } = fakeDatabase({
      first: moderationRecord({ status: reportStatus, theme_status: targetStatus }),
    })
    await expect(moderateReport(db, 'report-1', action, 99)).rejects.toMatchObject({ code: 'conflict' })
    expect(batch).not.toHaveBeenCalled()
    expect(statements).toHaveLength(1)
  })

  it('rejects restoring a deleted comment even when its report is resolved', async () => {
    const { db } = fakeDatabase({
      first: moderationRecord({ target_type: 'comment', status: 'resolved', comment_status: 'deleted' }),
    })
    await expect(moderateReport(db, 'report-1', 'restore', 99)).rejects.toMatchObject({ code: 'conflict' })
  })

  it('distinguishes unknown reports and missing targets', async () => {
    const unknown = fakeDatabase()
    await expect(moderateReport(unknown.db, 'missing', 'resolve', 99)).rejects.toMatchObject({ code: 'not_found' })

    const missingTarget = fakeDatabase({ first: moderationRecord({ theme_status: null }) })
    await expect(moderateReport(missingTarget.db, 'report-1', 'resolve', 99)).rejects.toMatchObject({ code: 'not_found' })
  })
})
