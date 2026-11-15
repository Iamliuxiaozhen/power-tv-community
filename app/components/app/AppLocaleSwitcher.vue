<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()

async function changeLocale(event: Event): Promise<void> {
  const code = (event.target as HTMLSelectElement).value as Parameters<typeof setLocale>[0]
  if (code && code !== locale.value) await setLocale(code)
}
</script>

<template>
  <label class="locale-control">
    <Icon name="material-symbols:language" size="20" aria-hidden="true" />
    <span class="visually-hidden">{{ t('header.language') }}</span>
    <select :value="locale" :aria-label="t('header.language')" @change="changeLocale">
      <option v-for="item in locales" :key="item.code" :value="item.code">
        {{ item.name }}
      </option>
    </select>
    <Icon name="material-symbols:expand-more" size="18" aria-hidden="true" />
  </label>
</template>
