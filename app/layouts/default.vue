<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">{{ t('app.skipToContent') }}</a>
    <AppHeader />
    <main id="main-content" class="app-main" tabindex="-1">
      <slot />
    </main>
    <AppFooter />
    <AppMobileNavigation />
    <AppSnackbar />
  </div>
</template>
