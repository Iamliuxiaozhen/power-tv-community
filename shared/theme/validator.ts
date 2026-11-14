import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import schema from './theme.schema.json'
import { normalizeVersion } from './version'
import type { NormalizedThemeManifest, ThemeManifest, ThemeValidationIssue } from './types'

export const THEME_SCHEMA_SOURCE = 'https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/theme.schema.json'

export class ThemeValidationError extends Error {
  readonly issues: ThemeValidationIssue[]

  constructor(issues: ThemeValidationIssue[]) {
    super(issues[0]?.message ?? '主题包无效')
    this.name = 'ThemeValidationError'
    this.issues = issues
  }
}

const ajv = new Ajv({ allErrors: true, strict: true })
const validateSchema = ajv.compile<ThemeManifest>(schema) as ValidateFunction<ThemeManifest>

export function validateThemeManifest(input: unknown): NormalizedThemeManifest {
  if (!validateSchema(input)) {
    throw new ThemeValidationError((validateSchema.errors ?? []).map(formatSchemaIssue))
  }

  const issues: ThemeValidationIssue[] = []
  if (input.id.includes('..') || input.id.toLowerCase().startsWith('builtin.')) {
    issues.push({ path: '/id', message: '主题 ID 不能包含连续点号或使用内置主题前缀' })
  }

  if (input.layout?.visible?.some(module => !input.layout?.order.includes(module))) {
    issues.push({ path: '/layout/visible', message: '可见模块必须包含在模块顺序中' })
  }

  try {
    normalizeVersion(input.version)
  }
  catch {
    issues.push({ path: '/version', message: '主题版本号无效' })
  }

  if (issues.length > 0) throw new ThemeValidationError(issues)

  return {
    ...input,
    version: normalizeVersion(input.version),
  }
}

function formatSchemaIssue(error: ErrorObject): ThemeValidationIssue {
  const path = error.instancePath || '/'
  const field = error.keyword === 'required'
    ? `${path.replace(/\/$/, '')}/${error.params.missingProperty}`.replace(/^\/\//, '/')
    : path
  return { path: field, message: `主题配置 ${field} ${error.message ?? '无效'}` }
}

export function localizedText(value: string | Record<string, string> | undefined, fallback = ''): string {
  if (typeof value === 'string') return value.trim() || fallback
  if (!value) return fallback

  for (const locale of ['zh-CN', 'en', 'default']) {
    const text = value[locale]?.trim()
    if (text) return text
  }

  return Object.values(value).find(text => text.trim())?.trim() ?? fallback
}
