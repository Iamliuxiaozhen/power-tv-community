export interface ParsedVersion {
  normalized: string
  parts: [string, string, string]
}

export function parseVersion(value = '1.0.0'): ParsedVersion {
  if (!/^\d+(?:\.\d+){0,2}$/.test(value)) {
    throw new Error('版本号必须由一至三段十进制数字组成')
  }

  const numbers = value.split('.')
  const parts = [0, 1, 2].map(index => BigInt(numbers[index] ?? '0').toString()) as [string, string, string]
  return { normalized: parts.join('.'), parts }
}

export function normalizeVersion(value?: string): string {
  return parseVersion(value).normalized
}

export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left).parts
  const b = parseVersion(right).parts

  for (let index = 0; index < 3; index += 1) {
    const difference = BigInt(a[index]!) - BigInt(b[index]!)
    if (difference < 0n) return -1
    if (difference > 0n) return 1
  }

  return 0
}
