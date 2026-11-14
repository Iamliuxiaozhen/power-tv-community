export type ColorMode = 'system' | 'light' | 'dark'

const colorModes: { value: ColorMode, label: string, icon: string }[] = [
  { value: 'system', label: '跟随系统', icon: 'material-symbols:brightness-auto-outline' },
  { value: 'light', label: '浅色模式', icon: 'material-symbols:light-mode-outline' },
  { value: 'dark', label: '深色模式', icon: 'material-symbols:dark-mode-outline' },
]

export function useColorMode() {
  const cookie = useCookie<ColorMode>('power-tv-color-mode', {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const mode = computed<ColorMode>({
    get: () => colorModes.some(option => option.value === cookie.value) ? cookie.value : 'system',
    set: value => { cookie.value = value },
  })
  const selected = computed(() => colorModes.find(option => option.value === mode.value) ?? colorModes[0]!)

  useHead({
    htmlAttrs: {
      'data-color-mode': mode,
    },
  })

  return { colorModes, mode, selected }
}
