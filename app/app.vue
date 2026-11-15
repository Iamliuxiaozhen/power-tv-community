<script setup lang="ts">
const { t, locale, localeProperties } = useI18n()

useHead({
  htmlAttrs: { lang: computed(() => localeProperties.value?.language ?? locale.value) },
  titleTemplate: title => title ? t('app.titleTemplate', { title }) : t('app.title'),
  meta: [
    { name: 'description', content: computed(() => t('app.description')) },
    { name: 'theme-color', content: '#f7faf9' },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
