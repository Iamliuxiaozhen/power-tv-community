import { imageSize } from 'image-size'
import { Unzip, UnzipInflate } from 'fflate'
import { ThemeValidationError, validateThemeManifest } from '#shared/theme/validator'
import type { ThemeImage, ValidatedThemePackage } from '#shared/theme/types'

export const MAX_PACKAGE_BYTES = 10 * 1024 * 1024
export const MAX_ARCHIVE_ENTRIES = 64
export const MAX_UNCOMPRESSED_BYTES = 8 * 1024 * 1024
export const MAX_MANIFEST_BYTES = 256 * 1024
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024
export const MAX_IMAGE_PIXELS = 4_000_000

const IMAGE_PATH = /^(?:assets\/[^/]+|preview)\.(png|jpg|jpeg|webp)$/
const EXECUTABLE_PATH = /\.(?:apk|bat|cmd|cjs|dll|dex|exe|html?|jar|js|mjs|sh|so|svg|ts)$/i
const decoder = new TextDecoder('utf-8', { fatal: true })

interface ArchiveEntry {
  name: string
  directory: boolean
}

export async function validateThemePackage(input: Uint8Array): Promise<ValidatedThemePackage> {
  if (input.byteLength === 0 || input.byteLength > MAX_PACKAGE_BYTES) {
    throw invalid('主题包不能为空且压缩包大小不能超过 10 MiB')
  }

  const zip = isZip(input)
  if (!zip && input.byteLength > MAX_MANIFEST_BYTES) {
    throw invalid('裸 JSON 主题不能超过 256 KiB', 'theme.json')
  }

  const files = zip ? await extractArchive(input) : new Map<string, Uint8Array>([['theme.json', input]])
  const manifestBytes = files.get('theme.json')
  if (!manifestBytes) throw invalid('压缩包根目录缺少 theme.json', 'theme.json')
  if (manifestBytes.byteLength > MAX_MANIFEST_BYTES) {
    throw invalid('theme.json 不能超过 256 KiB', 'theme.json')
  }

  const manifest = validateThemeManifest(parseJson(manifestBytes))
  if (!zip && manifest.backdrop) {
    throw invalid('裸 JSON 主题不能引用背景图片，请使用 .ptheme 或 .zip', '/backdrop')
  }

  const images = new Map<string, ThemeImage>()
  for (const [path, data] of files) {
    if (IMAGE_PATH.test(path)) images.set(path, readImage(path, data))
  }

  let backdrop: ThemeImage | undefined
  if (manifest.backdrop) {
    backdrop = images.get(manifest.backdrop.image)
    if (!backdrop) throw invalid('找不到背景图片或图片格式不受支持', '/backdrop/image')
  }

  const preview = [...images.entries()].find(([path]) => path.startsWith('preview.'))?.[1]
  const sha256 = await digestHex(input)
  const result: ValidatedThemePackage = {
    manifest,
    packageData: input,
    packageKind: zip ? 'zip' : 'json',
    sha256,
    byteSize: input.byteLength,
  }
  if (preview) result.preview = preview
  if (backdrop) result.backdrop = backdrop
  return result
}

function isZip(data: Uint8Array): boolean {
  if (data.length < 4 || data[0] !== 0x50 || data[1] !== 0x4b) return false
  return (data[2] === 3 && data[3] === 4)
    || (data[2] === 5 && data[3] === 6)
    || (data[2] === 7 && data[3] === 8)
}

function parseJson(data: Uint8Array): unknown {
  try {
    const text = decoder.decode(data).replace(/^\uFEFF/, '')
    return JSON.parse(text) as unknown
  }
  catch {
    throw invalid('theme.json 必须是有效的 UTF-8 JSON', 'theme.json')
  }
}

function preflightArchive(data: Uint8Array): ArchiveEntry[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  let eocd = -1
  for (let offset = data.length - 22; offset >= Math.max(0, data.length - 65_557); offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset
      break
    }
  }
  if (eocd < 0) throw invalid('ZIP 目录损坏或不受支持')

  const entryCount = view.getUint16(eocd + 10, true)
  const centralSize = view.getUint32(eocd + 12, true)
  const centralOffset = view.getUint32(eocd + 16, true)
  if (view.getUint16(eocd + 4, true) !== 0 || view.getUint16(eocd + 6, true) !== 0
    || view.getUint16(eocd + 8, true) !== entryCount || entryCount === 0xffff
    || centralSize === 0xffffffff || centralOffset === 0xffffffff
    || centralOffset + centralSize > data.length) {
    throw invalid('不支持多磁盘或 ZIP64 压缩包')
  }
  if (entryCount > MAX_ARCHIVE_ENTRIES) throw invalid('ZIP 最多允许 64 个条目')
  if (eocd + 22 + view.getUint16(eocd + 20, true) !== data.length) {
    throw invalid('ZIP 末尾包含无效数据')
  }

  const entries: ArchiveEntry[] = []
  const names = new Set<string>()
  let offset = centralOffset
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > data.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw invalid('ZIP 中央目录损坏')
    }
    const flags = view.getUint16(offset + 8, true)
    const compression = view.getUint16(offset + 10, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    if ((flags & 0x41) !== 0) throw invalid('不支持加密 ZIP 条目')
    if (compression !== 0 && compression !== 8) throw invalid('ZIP 仅支持存储或 Deflate 压缩')
    if (offset + 46 + nameLength + extraLength + commentLength > data.length) {
      throw invalid('ZIP 条目长度无效')
    }

    let name: string
    try {
      name = decoder.decode(data.subarray(offset + 46, offset + 46 + nameLength))
    }
    catch {
      throw invalid('ZIP 条目路径必须是有效 UTF-8')
    }
    validateArchivePath(name)
    if (names.has(name)) throw invalid(`ZIP 包含重复条目：${name}`)
    names.add(name)
    if (EXECUTABLE_PATH.test(name)) throw invalid(`主题包不能包含可执行代码或脚本：${name}`)

    entries.push({ name, directory: name.endsWith('/') })
    offset += 46 + nameLength + extraLength + commentLength
  }
  if (offset !== centralOffset + centralSize) throw invalid('ZIP 中央目录大小不一致')
  return entries
}

function validateArchivePath(name: string): void {
  if (!name || name.includes('\\') || name.startsWith('/') || /^[a-z]:/i.test(name)
    || [...name].some(character => {
      const code = character.codePointAt(0) ?? 0
      return code <= 0x1f || code === 0x7f
    })) {
    throw invalid(`ZIP 条目路径不安全：${name || '(空路径)'}`)
  }
  const path = name.endsWith('/') ? name.slice(0, -1) : name
  const segments = path.split('/')
  if (!path || segments.some(segment => !segment || segment === '.' || segment === '..')) {
    throw invalid(`ZIP 条目路径不安全：${name}`)
  }
}

async function extractArchive(data: Uint8Array): Promise<Map<string, Uint8Array>> {
  const entries = preflightArchive(data)
  const expected = new Map(entries.map(entry => [entry.name, entry]))
  const files = new Map<string, Uint8Array>()
  const seen = new Set<string>()
  let totalBytes = 0

  return new Promise((resolve, reject) => {
    try {
      const archive = new Unzip((file) => {
        const entry = expected.get(file.name)
        if (!entry) throw invalid('ZIP 本地条目与中央目录不一致')
        if (seen.has(entry.name)) throw invalid(`ZIP 包含重复本地条目：${entry.name}`)
        seen.add(entry.name)
        const keep = entry.name === 'theme.json' || IMAGE_PATH.test(entry.name)
        const chunks: Uint8Array[] = []
        let fileBytes = 0

        file.ondata = (error, chunk, final) => {
          if (error) throw error
          fileBytes += chunk.byteLength
          totalBytes += chunk.byteLength
          if (totalBytes > MAX_UNCOMPRESSED_BYTES) throw invalid('ZIP 实际解压总量不能超过 8 MiB')
          if (entry.name === 'theme.json' && fileBytes > MAX_MANIFEST_BYTES) {
            throw invalid('theme.json 不能超过 256 KiB', 'theme.json')
          }
          if (IMAGE_PATH.test(entry.name) && fileBytes > MAX_IMAGE_BYTES) {
            throw invalid(`图片不能超过 4 MiB：${entry.name}`)
          }
          if (keep) chunks.push(chunk.slice())
          if (final && keep) files.set(entry.name, concatChunks(chunks, fileBytes))
        }
        file.start()
      })
      archive.register(UnzipInflate)

      const chunkSize = 16 * 1024
      for (let offset = 0; offset < data.length; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, data.length)
        archive.push(data.subarray(offset, end), end === data.length)
      }
      if (seen.size !== expected.size) throw invalid('ZIP 本地条目数量与中央目录不一致')
      resolve(files)
    }
    catch (error) {
      reject(error instanceof ThemeValidationError ? error : invalid('ZIP 压缩包损坏或无法解压'))
    }
  })
}

function concatChunks(chunks: Uint8Array[], length: number): Uint8Array {
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

function readImage(path: string, data: Uint8Array): ThemeImage {
  if (data.byteLength > MAX_IMAGE_BYTES) throw invalid(`图片不能超过 4 MiB：${path}`)
  const extension = path.split('.').pop()?.toLowerCase()
  const expectedType = extension === 'png' ? 'png' : extension === 'webp' ? 'webp' : 'jpg'
  if (!hasImageSignature(expectedType, data)) throw invalid(`图片真实格式与扩展名不符：${path}`)

  try {
    const dimensions = imageSize(data)
    if (dimensions.type !== expectedType || !dimensions.width || !dimensions.height) {
      throw new Error('type mismatch')
    }
    if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
      throw invalid(`图片不能超过 400 万像素：${path}`)
    }
    return {
      path,
      data,
      contentType: expectedType === 'png' ? 'image/png' : expectedType === 'webp' ? 'image/webp' : 'image/jpeg',
      width: dimensions.width,
      height: dimensions.height,
    }
  }
  catch (error) {
    if (error instanceof ThemeValidationError) throw error
    throw invalid(`图片损坏或格式不受支持：${path}`)
  }
}

function hasImageSignature(type: string, data: Uint8Array): boolean {
  if (type === 'png') {
    return data.length >= 45
      && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => data[index] === byte)
      && [0x49, 0x45, 0x4e, 0x44].every((byte, index) => data[data.length - 8 + index] === byte)
  }
  if (type === 'jpg') {
    return data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
      && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9
  }
  if (data.length < 20) return false
  const declaredSize = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(4, true)
  return decoder.decode(data.subarray(0, 4)) === 'RIFF'
    && decoder.decode(data.subarray(8, 12)) === 'WEBP' && declaredSize + 8 === data.length
}

async function digestHex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data.slice().buffer)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function invalid(message: string, path = 'archive'): ThemeValidationError {
  return new ThemeValidationError([{ path, message }])
}
