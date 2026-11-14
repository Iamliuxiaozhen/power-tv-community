import { isAllowedOrigin } from '#shared/security'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'self'",
      "connect-src 'self'",
      "font-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.githubusercontent.com",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
    ].join('; '),
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  })

  if (!event.path.startsWith('/api/') || SAFE_METHODS.has(event.method)) return

  const requestOrigin = getRequestURL(event).origin
  const configuredOrigin = new URL(useRuntimeConfig(event).appUrl).origin
  const origin = getRequestHeader(event, 'origin')
  if (!isAllowedOrigin(origin, [configuredOrigin, requestOrigin])) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-origin request rejected' })
  }
})
