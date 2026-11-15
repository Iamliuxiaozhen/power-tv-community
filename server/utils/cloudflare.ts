import { createError, type H3Event } from 'h3'

let cachedEnv: Env | undefined

export function cacheCloudflareEnv(env: Env): void {
  cachedEnv = env
}

export function getCloudflareEnv(event: H3Event): Env {
  // 内部 $fetch 生成的新事件不会携带 Pages 注入的 cloudflare 上下文，复用同一 isolate 已捕获的绑定。
  const env = (event.context.cloudflare?.env as unknown as Env | undefined) ?? cachedEnv

  if (!env) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Cloudflare bindings are not available',
    })
  }

  return env
}

export function getDatabase(event: H3Event): D1Database {
  return getCloudflareEnv(event).DB
}

export function getThemeBucket(event: H3Event): R2Bucket {
  return getCloudflareEnv(event).THEME_BUCKET
}
