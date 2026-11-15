export type ColorMode = 'system' | 'light' | 'dark'

const colorModes: { value: ColorMode, labelKey: string, icon: string }[] = [
  { value: 'system', labelKey: 'colorMode.system', icon: 'material-symbols:brightness-auto-outline' },
  { value: 'light', labelKey: 'colorMode.light', icon: 'material-symbols:light-mode-outline' },
  { value: 'dark', labelKey: 'colorMode.dark', icon: 'material-symbols:dark-mode-outline' },
]

export function useColorMode() {
  const { t } = useI18n()
  const cookie = useCookie<ColorMode>('power-tv-color-mode', {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const mode = computed<ColorMode>({
    get: () => colorModes.some(option => option.value === cookie.value) ? cookie.value : 'system',
    set: value => { cookie.value = value },
  })
  const modes = computed(() => colorModes.map(option => ({ ...option, label: t(option.labelKey) })))
  const selected = computed(() => modes.value.find(option => option.value === mode.value) ?? modes.value[0]!)

  useHead({
    htmlAttrs: {
      'data-color-mode': mode,
    },
  })

  return { colorModes: modes, mode, selected }
}
