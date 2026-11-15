import { formatByteSize, formatDate } from '~/utils/format'

export function useFormatters() {
  const { locale } = useI18n()

  return {
    formatByteSize,
    formatDate: (value: string): string => formatDate(value, locale.value),
  }
}
