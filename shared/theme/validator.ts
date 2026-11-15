import type { ErrorObject, ValidateFunction } from 'ajv'
import generatedValidate from './theme-validator.generated'
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

// Cloudflare Workers 禁止运行时 new Function，校验器由 theme.schema.json 在构建期预编译。
const validateSchema = generatedValidate as unknown as ValidateFunction<ThemeManifest>

export function validateThemeManifest(input: unknown): NormalizedThemeManifest {
  if (!validateSchema(input)) {
    throw new ThemeValidationError((validateSchema.errors ?? []).map(formatSchemaIssue))
  }

  const issues: ThemeValidationIssue[] = []
  if (input.id.includes('..') || input.id.toLowerCase().startsWith('builtin.')) {
    issues.push({ path: '/id', message: '主题 ID 不能包含连续点号或使用内置主题前缀', code: 'validation.id' })
  }

  if (input.layout?.visible?.some(module => !input.layout?.order.includes(module))) {
    issues.push({ path: '/layout/visible', message: '可见模块必须包含在模块顺序中', code: 'validation.layoutVisible' })
  }

  try {
    normalizeVersion(input.version)
  }
  catch {
    issues.push({ path: '/version', message: '主题版本号无效', code: 'validation.version' })
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
  const reason = error.message ?? '无效'
  return {
    path: field,
    message: `主题配置 ${field} ${reason}`,
    code: 'validation.schema',
    params: { field, reason },
  }
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
