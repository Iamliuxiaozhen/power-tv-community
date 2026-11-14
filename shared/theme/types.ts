export type LocalizedText = string | Record<string, string>

export type ThemeColorRole =
  | 'primary' | 'onPrimary' | 'primaryContainer' | 'onPrimaryContainer'
  | 'secondary' | 'onSecondary' | 'secondaryContainer' | 'onSecondaryContainer'
  | 'tertiary' | 'onTertiary' | 'tertiaryContainer' | 'onTertiaryContainer'
  | 'error' | 'onError' | 'errorContainer' | 'onErrorContainer'
  | 'background' | 'onBackground' | 'surface' | 'onSurface'
  | 'surfaceVariant' | 'onSurfaceVariant' | 'outline' | 'outlineVariant'
  | 'surfaceContainerLowest' | 'surfaceContainerLow' | 'surfaceContainer'
  | 'surfaceContainerHigh' | 'surfaceContainerHighest'

export type ThemeColors = Partial<Record<ThemeColorRole, string>>

export interface ThemeManifest {
  $schema?: string
  schemaVersion: 1
  id: string
  name: LocalizedText
  description?: LocalizedText
  author?: string
  version?: string
  minAppVersion?: string
  seed?: string
  schemes: { light: ThemeColors, dark?: ThemeColors }
  dataViz?: {
    light?: Partial<Record<'loadLow' | 'loadMedium' | 'loadHigh' | 'chartGrid' | 'chartFill' | 'liveDot', string>>
    dark?: Partial<Record<'loadLow' | 'loadMedium' | 'loadHigh' | 'chartGrid' | 'chartFill' | 'liveDot', string>>
  }
  typography?: {
    metricFont?: ThemeFont
    monoFont?: ThemeFont
  }
  shape?: { cardRadiusDp?: number }
  backdrop?: { image: string, dim?: number }
  layout?: {
    order: ThemeModule[]
    visible?: ThemeModule[]
  }
}

export type ThemeFont = 'sans-serif' | 'sans-serif-medium' | 'sans-serif-light' | 'sans-serif-thin' | 'sans-serif-condensed' | 'serif' | 'monospace'
export type ThemeModule = 'hero' | 'cpu' | 'gpu' | 'thermal' | 'memory' | 'battery' | 'device'

export interface NormalizedThemeManifest extends ThemeManifest {
  version: string
}

export interface ThemeValidationIssue {
  path: string
  message: string
}

export interface ThemeImage {
  path: string
  data: Uint8Array
  contentType: 'image/png' | 'image/jpeg' | 'image/webp'
  width: number
  height: number
}

export interface ValidatedThemePackage {
  manifest: NormalizedThemeManifest
  packageData: Uint8Array
  packageKind: 'json' | 'zip'
  preview?: ThemeImage
  backdrop?: ThemeImage
  sha256: string
  byteSize: number
}
