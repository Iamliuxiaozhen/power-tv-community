import { createError, setResponseHeaders, type H3Event } from 'h3'
import { contentDisposition } from '#shared/security'
import type { VersionRow } from './repositories/types'

export async function serveThemePackage(event: H3Event, version: VersionRow, immutable: boolean) {
  const object = await getThemeBucket(event).get(version.package_key)
  if (!object) throw createError({ statusCode: 404, statusMessage: 'Theme package not found' })

  setResponseHeaders(event, {
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-store',
    'Content-Disposition': contentDisposition(version.original_filename),
    'Content-Length': String(object.size),
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Type': 'application/octet-stream',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'ETag': object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  })
  if (event.method === 'GET') await incrementThemeDownloads(getDatabase(event), version.theme_id)
  return object.body
}

export async function serveThemeImage(event: H3Event, version: VersionRow, kind: 'preview' | 'backdrop') {
  const key = kind === 'preview' ? version.preview_key : version.backdrop_key
  const contentType = kind === 'preview' ? version.preview_content_type : version.backdrop_content_type
  if (!key || !contentType || !['image/png', 'image/jpeg', 'image/webp'].includes(contentType)) {
    throw createError({ statusCode: 404, statusMessage: 'Theme image not found' })
  }

  const object = await getThemeBucket(event).get(key)
  if (!object) throw createError({ statusCode: 404, statusMessage: 'Theme image not found' })
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
  setResponseHeaders(event, {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Disposition': contentDisposition(`${version.theme_id}-${version.version}-${kind}.${extension}`, 'inline'),
    'Content-Length': String(object.size),
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Type': contentType,
    'Cross-Origin-Resource-Policy': 'same-origin',
    'ETag': object.httpEtag,
    'X-Content-Type-Options': 'nosniff',
  })
  return object.body
}
