function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })
}

export function safeReturnTo(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback
  }
  if (value.includes('\\') || hasControlCharacters(value)) {
    return fallback
  }

  try {
    const base = new URL('https://community.invalid')
    const target = new URL(value, base)
    if (target.origin !== base.origin) return fallback
    return `${target.pathname}${target.search}${target.hash}`
  }
  catch {
    return fallback
  }
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false
  try {
    const parsed = new URL(origin)
    return parsed.origin === origin && allowedOrigins.includes(parsed.origin)
  }
  catch {
    return false
  }
}

export function safeDownloadFileName(value: string): string {
  const leaf = value.split(/[\\/]/).at(-1) ?? ''
  const cleaned = Array.from(leaf, character =>
    hasControlCharacters(character) || character === '"' || character === '\\' ? '_' : character)
    .join('')
    .trim()
    .replace(/^\.+/, '')
  return Array.from(cleaned).slice(0, 180).join('') || 'theme.ptheme'
}

export function contentDisposition(value: string, disposition: 'attachment' | 'inline' = 'attachment'): string {
  const fileName = safeDownloadFileName(value)
  const asciiName = fileName.replace(/[^\x20-\x7E]/g, '_')
  const encodedName = encodeURIComponent(fileName).replace(/['()*]/g, character =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`
}
