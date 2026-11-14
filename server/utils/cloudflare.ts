import { createError, type H3Event } from 'h3'

export function getCloudflareEnv(event: H3Event): Env {
  const env = event.context.cloudflare?.env as unknown as Env | undefined

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
