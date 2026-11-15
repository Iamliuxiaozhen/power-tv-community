<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <div class="app-footer__intro">
        <span class="brand__mark" aria-hidden="true">
          <Icon name="material-symbols:palette-outline" size="22" />
        </span>
        <div>
          <strong>{{ t('footer.brand') }}</strong>
          <p>{{ t('footer.tagline') }}</p>
        </div>
      </div>
      <nav class="app-footer__links" :aria-label="t('footer.links')">
        <NuxtLink to="/guide">{{ t('footer.guide') }}</NuxtLink>
        <a href="https://power-tv.liuxiaozhen.dev" target="_blank" rel="noreferrer">{{ t('footer.website') }}</a>
        <a href="https://github.com/Iamliuxiaozhen/power-tv" target="_blank" rel="noreferrer">{{ t('footer.appSource') }}</a>
        <a href="https://github.com/Iamliuxiaozhen/power-tv-community" target="_blank" rel="noreferrer">{{ t('footer.communitySource') }}</a>
      </nav>
    </div>
  </footer>
</template>
