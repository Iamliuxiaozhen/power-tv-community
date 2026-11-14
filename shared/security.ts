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
