export async function consumeRateLimit(
  db: D1Database,
  userId: number,
  action: string,
  maximum: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now()
  const windowStart = Math.floor(now / windowMs) * windowMs
  const result = await db.prepare(`
    INSERT INTO rate_limits (user_id, action, window_key, count, expires_at)
    VALUES (?, ?, ?, 1, ?)
    ON CONFLICT(user_id, action, window_key) DO UPDATE SET
      count = count + 1, expires_at = excluded.expires_at
    WHERE rate_limits.count < ? AND rate_limits.expires_at > ?
    RETURNING count
  `).bind(userId, action, String(windowStart), windowStart + windowMs, maximum, now).first<{ count: number }>()
  return Boolean(result && result.count <= maximum)
}
