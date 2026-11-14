import { describe, expect, it, vi } from 'vitest'
import { getDashboardStats, getReactionState, setThemeReaction } from '../../server/utils/repositories/interactions'

interface FakeStatement {
  sql: string
  bindings: unknown[]
}

function fakeDatabase(batchResults: unknown[] = []) {
  const statements: FakeStatement[] = []
  const prepare = vi.fn((sql: string) => ({
    bind: (...bindings: unknown[]) => {
      const statement = { sql, bindings }
      statements.push(statement)
      return statement
    },
  }))
  const batch = vi.fn().mockResolvedValue(batchResults)
  const db = { prepare, batch } as unknown as D1Database
  return { db, statements, batch }
}

describe('theme reactions', () => {
  it('only updates the public like counter for like reactions', async () => {
    const { db, statements } = fakeDatabase()
    await setThemeReaction(db, 7, 'user.ocean', 'likes', true)
    await setThemeReaction(db, 7, 'user.ocean', 'favorites', true)

    expect(statements).toHaveLength(3)
    expect(statements[0]?.sql).toContain('INSERT INTO likes')
    expect(statements[1]?.sql).toContain('UPDATE themes SET likes = likes +')
    expect(statements[2]?.sql).toContain('INSERT INTO favorites')
  })

  it('reads both reaction flags for the current viewer', async () => {
    const { db } = fakeDatabase([{ results: [{ value: 1 }] }, { results: [] }])
    await expect(getReactionState(db, 7, 'user.ocean')).resolves.toEqual({ liked: true, favorited: false })
  })
})

describe('dashboard statistics', () => {
  it('returns numeric totals and handles empty results', async () => {
    const populated = fakeDatabase([
      { results: [{ themes: 3, downloads: 42, likes: 8 }] },
      { results: [{ favorites: 2 }] },
    ])
    await expect(getDashboardStats(populated.db, 7)).resolves.toEqual({
      themes: 3,
      favorites: 2,
      downloads: 42,
      likes: 8,
    })
    expect(populated.batch).toHaveBeenCalledOnce()

    const empty = fakeDatabase([{ results: [] }, { results: [] }])
    await expect(getDashboardStats(empty.db, 7)).resolves.toEqual({
      themes: 0,
      favorites: 0,
      downloads: 0,
      likes: 0,
    })
  })
})
