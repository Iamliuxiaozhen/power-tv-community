import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { validateThemePackage } from '../../server/utils/theme-archive'
import template from '../fixtures/template.theme.json'

const png = Uint8Array.from(Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
))

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...structuredClone(template), ...overrides }
}

function manifestBytes(overrides: Record<string, unknown> = {}): Uint8Array {
  return strToU8(JSON.stringify(manifest(overrides)))
}

function archive(files: Record<string, Uint8Array>, level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6): Uint8Array {
  return zipSync(files, { level })
}

describe('theme package validation', () => {
  it('accepts a bare upstream JSON manifest and preserves its bytes', async () => {
    const input = manifestBytes()
    const result = await validateThemePackage(input)
    expect(result.packageKind).toBe('json')
    expect(result.manifest.id).toBe('user.my-theme')
    expect(result.packageData).toEqual(input)
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('accepts a ZIP with a preview and backdrop', async () => {
    const input = archive({
      'theme.json': manifestBytes({ backdrop: { image: 'assets/backdrop.png', dim: 0.3 } }),
      'preview.png': png,
      'assets/backdrop.png': png,
    })
    const result = await validateThemePackage(input)
    expect(result.packageKind).toBe('zip')
    expect(result.preview?.contentType).toBe('image/png')
    expect(result.backdrop?.width).toBe(1)
    expect(result.packageData).toEqual(input)
  })

  it('rejects Zip Slip paths', async () => {
    await expect(validateThemePackage(archive({ '../theme.json': manifestBytes() })))
      .rejects.toThrow('路径不安全')
  })

  it('rejects duplicate theme.json entries', async () => {
    const zipped = archive({ 'theme.json': manifestBytes(), 'theme.jsn1': manifestBytes() })
    const duplicate = Uint8Array.from(Buffer.from(
      Buffer.from(zipped).toString('latin1').replaceAll('theme.jsn1', 'theme.json'),
      'latin1',
    ))
    await expect(validateThemePackage(duplicate)).rejects.toThrow('重复条目')
  })

  it('rejects encrypted entries from the central directory flags', async () => {
    const zipped = Buffer.from(archive({ 'theme.json': manifestBytes() }))
    const central = zipped.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
    expect(central).toBeGreaterThan(0)
    zipped.writeUInt16LE(zipped.readUInt16LE(central + 8) | 1, central + 8)
    await expect(validateThemePackage(zipped)).rejects.toThrow('加密')
  })

  it('rejects more than 64 archive entries', async () => {
    const files: Record<string, Uint8Array> = { 'theme.json': manifestBytes() }
    for (let index = 0; index < 64; index += 1) files[`note-${index}.txt`] = strToU8('note')
    await expect(validateThemePackage(archive(files))).rejects.toThrow('64')
  })

  it('counts actual uncompressed bytes instead of trusting ZIP metadata', async () => {
    const input = archive({
      'theme.json': manifestBytes(),
      'large.bin': new Uint8Array(8 * 1024 * 1024 + 1),
    }, 0)
    await expect(validateThemePackage(input)).rejects.toThrow('8 MiB')
  })

  it('rejects disguised images and missing backdrops', async () => {
    const backdrop = { image: 'assets/backdrop.png' }
    await expect(validateThemePackage(archive({
      'theme.json': manifestBytes({ backdrop }),
      'assets/backdrop.png': strToU8('not a png'),
    }))).rejects.toThrow('真实格式')
    await expect(validateThemePackage(archive({
      'theme.json': manifestBytes({ backdrop }),
    }))).rejects.toThrow('找不到背景图片')
  })

  it('rejects images above four million pixels', async () => {
    const large = png.slice()
    new DataView(large.buffer).setUint32(16, 3000)
    new DataView(large.buffer).setUint32(20, 2000)
    await expect(validateThemePackage(archive({
      'theme.json': manifestBytes({ backdrop: { image: 'assets/backdrop.png' } }),
      'assets/backdrop.png': large,
    }))).rejects.toThrow('400 万像素')
  })

  it('rejects executable entries and oversized bare JSON', async () => {
    await expect(validateThemePackage(archive({
      'theme.json': manifestBytes(),
      'payload.js': strToU8('alert(1)'),
    }))).rejects.toThrow('脚本')
    await expect(validateThemePackage(new Uint8Array(256 * 1024 + 1))).rejects.toThrow('256 KiB')
  })

  it('rejects a backdrop in a bare JSON package', async () => {
    await expect(validateThemePackage(manifestBytes({ backdrop: { image: 'assets/backdrop.png' } })))
      .rejects.toThrow('裸 JSON')
  })
})
