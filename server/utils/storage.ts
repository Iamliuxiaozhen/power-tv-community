import type { ValidatedThemePackage } from '#shared/theme/types'

export interface StoredThemeObjects {
  packageKey: string
  previewKey: string | null
  backdropKey: string | null
  keys: string[]
}

export async function storeThemeObjects(
  bucket: R2Bucket,
  themeId: string,
  version: string,
  input: ValidatedThemePackage,
): Promise<StoredThemeObjects> {
  const root = `themes/${themeId}/${version}/${crypto.randomUUID()}`
  const packageKey = `${root}/package.${input.packageKind === 'json' ? 'json' : 'ptheme'}`
  const previewKey = input.preview ? `${root}/preview.${extension(input.preview.contentType)}` : null
  const backdropKey = input.backdrop ? `${root}/backdrop.${extension(input.backdrop.contentType)}` : null
  const keys = [packageKey]
  if (previewKey) keys.push(previewKey)
  if (backdropKey) keys.push(backdropKey)

  try {
    await bucket.put(packageKey, input.packageData, {
      httpMetadata: { contentType: 'application/octet-stream' },
      customMetadata: { sha256: input.sha256 },
    })
    if (input.preview && previewKey) {
      await bucket.put(previewKey, input.preview.data, { httpMetadata: { contentType: input.preview.contentType } })
    }
    if (input.backdrop && backdropKey) {
      await bucket.put(backdropKey, input.backdrop.data, { httpMetadata: { contentType: input.backdrop.contentType } })
    }
    return { packageKey, previewKey, backdropKey, keys }
  }
  catch (error) {
    await Promise.allSettled(keys.map(key => bucket.delete(key)))
    throw error
  }
}

export async function removeThemeObjects(bucket: R2Bucket, keys: string[]): Promise<void> {
  await Promise.allSettled(keys.map(key => bucket.delete(key)))
}

function extension(contentType: string): string {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}
