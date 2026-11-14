export interface GitHubUserInput {
  githubId: number
  login: string
  displayName: string | null
  avatarUrl: string
  githubUrl: string
}

export async function upsertGitHubUser(db: D1Database, input: GitHubUserInput): Promise<void> {
  const now = new Date().toISOString()
  await db.prepare(`
    INSERT INTO users (github_id, login, display_name, avatar_url, github_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(github_id) DO UPDATE SET
      login = excluded.login,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url,
      github_url = excluded.github_url,
      updated_at = excluded.updated_at
  `).bind(input.githubId, input.login, input.displayName, input.avatarUrl, input.githubUrl, now, now).run()
}

export async function findUserByLogin(db: D1Database, login: string) {
  return db.prepare(`
    SELECT github_id, login, display_name, avatar_url, github_url, created_at
    FROM users WHERE login = ? COLLATE NOCASE
  `).bind(login).first()
}
