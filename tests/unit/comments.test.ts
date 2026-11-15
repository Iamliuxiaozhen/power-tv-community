import { describe, expect, it, vi } from 'vitest'
import { addComment, deleteOwnComment, listComments } from '../../server/utils/repositories/interactions'

const commentRow = {
  id: 'comment-1',
  body: 'hidden body',
  status: 'hidden' as const,
  created_at: '2026-11-14T00:00:00.000Z',
  author_id: 7,
  login: 'creator',
  display_name: 'Creator',
  avatar_url: 'https://avatars.githubusercontent.com/u/7',
  github_url: 'https://github.com/creator',
}

describe('comment repository', () => {
  it('never exposes hidden comment bodies', async () => {
    const all = vi.fn().mockResolvedValue({ results: [commentRow] })
    const bind = vi.fn().mockReturnValue({ all })
    const db = { prepare: vi.fn().mockReturnValue({ bind }) } as unknown as D1Database

    const page = await listComments(db, 'user.ocean')
    expect(page.items[0]?.body).toBeNull()
    expect(page.items[0]?.author.login).toBe('creator')
    expect(page.nextCursor).toBeNull()
  })

  it('returns the persisted ID and timestamp for a new comment', async () => {
    const first = vi.fn().mockResolvedValue({ id: 'comment-2', created_at: '2026-11-14T01:00:00.000Z' })
    const bind = vi.fn().mockReturnValue({ first })
    const db = { prepare: vi.fn().mockReturnValue({ bind }) } as unknown as D1Database

    await expect(addComment(db, 'user.ocean', 7, 'Looks great')).resolves.toEqual({
      id: 'comment-2',
      createdAt: '2026-11-14T01:00:00.000Z',
    })
    expect(bind.mock.calls[0]?.slice(1)).toEqual(['user.ocean', 7, 'Looks great', expect.any(String), 'user.ocean'])
  })

  it('only treats a comment as deleted when one row changed', async () => {
    const run = vi.fn().mockResolvedValue({ meta: { changes: 1 } })
    const bind = vi.fn().mockReturnValue({ run })
    const db = { prepare: vi.fn().mockReturnValue({ bind }) } as unknown as D1Database
    await expect(deleteOwnComment(db, 'comment-1', 7)).resolves.toBe(true)

    run.mockResolvedValue({ meta: { changes: 0 } })
    await expect(deleteOwnComment(db, 'comment-1', 7)).resolves.toBe(false)
  })
})
