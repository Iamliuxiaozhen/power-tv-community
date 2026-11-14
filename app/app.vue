<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'zh-CN' },
  titleTemplate: title => title ? `${title} · power-tv 主题社区` : 'power-tv 主题社区',
  meta: [
    { name: 'description', content: '为 power-tv 1.5.0 及以上版本发现、发布和下载主题。' },
    { name: 'theme-color', content: '#f7faf9' },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
