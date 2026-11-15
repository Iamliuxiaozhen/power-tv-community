<script setup lang="ts">
import type { ThemeListResponse } from '#shared/community'

const { t } = useI18n()

useHead({ title: computed(() => t('home.metaTitle')) })

const { data, pending, error, refresh } = await useAsyncData('home-themes', async () => {
  const [latest, popular] = await Promise.all([
    $fetch<ThemeListResponse>('/api/themes', { query: { sort: 'latest', limit: 4 } }),
    $fetch<ThemeListResponse>('/api/themes', { query: { sort: 'downloads', limit: 4 } }),
  ])
  return { latest: latest.items, popular: popular.items }
})
</script>

<template>
  <div class="home-page">
    <section class="hero">
      <div class="hero__copy">
        <p class="eyebrow">{{ t('home.heroEyebrow') }}</p>
        <h1>{{ t('home.heroTitleLine1') }}<br><span>{{ t('home.heroTitleLine2') }}</span></h1>
        <p class="hero__description">
          {{ t('home.heroDescription') }}
        </p>
        <div class="hero__actions">
          <NuxtLink to="/themes" class="button">
            {{ t('home.browseThemes') }}
            <Icon name="material-symbols:arrow-forward" size="20" />
          </NuxtLink>
          <NuxtLink to="/upload" class="button button--tonal">
            <Icon name="material-symbols:upload" size="20" />
            {{ t('home.publishTheme') }}
          </NuxtLink>
        </div>
        <a class="hero__guide" href="https://power-tv.liuxiaozhen.dev" target="_blank" rel="noreferrer">
          {{ t('home.learnAbout') }}
          <Icon name="material-symbols:open-in-new" size="16" />
        </a>
      </div>

      <div class="hero__art" aria-hidden="true">
        <div class="hero__orb" />
        <div class="hero__dashboard">
          <div class="hero__dashboard-top"><i /><span /><b /></div>
          <div class="hero__dashboard-body">
            <div class="hero__welcome"><small>{{ t('home.mockEvening') }}</small><strong>{{ t('home.mockRoom') }}</strong><span /></div>
            <div class="hero__metric"><i /><span /><b /></div>
            <div class="hero__metric"><i /><span /><b /></div>
          </div>
        </div>
        <div class="hero__palette">
          <span v-for="color in ['#006a61', '#9ef2e5', '#cce5ff', '#f7faf9']" :key="color" :style="{ background: color }" />
        </div>
        <div class="hero__floating-chip"><Icon name="material-symbols:check" size="18" /> {{ t('home.securePackage') }}</div>
      </div>
    </section>

    <section class="trust-strip" :aria-label="t('home.featuresLabel')">
      <div><Icon name="material-symbols:verified-user-outline" size="23" /><span><strong>{{ t('home.featureSecureTitle') }}</strong><small>{{ t('home.featureSecureDescription') }}</small></span></div>
      <div><Icon name="material-symbols:history" size="23" /><span><strong>{{ t('home.featureHistoryTitle') }}</strong><small>{{ t('home.featureHistoryDescription') }}</small></span></div>
      <div><Icon name="material-symbols:code" size="23" /><span><strong>{{ t('home.featureOpenTitle') }}</strong><small>{{ t('home.featureOpenDescription') }}</small></span></div>
    </section>

    <div v-if="pending" class="theme-section">
      <div class="section-heading"><div><h2>{{ t('home.latestTitle') }}</h2><p>{{ t('home.latestDescription') }}</p></div></div>
      <div class="theme-grid"><div v-for="index in 4" :key="index" class="home-skeleton skeleton" /></div>
    </div>
    <AppEmptyState v-else-if="error" icon="material-symbols:cloud-off" :title="t('home.loadErrorTitle')" :description="t('home.loadErrorDescription')">
      <button type="button" class="button button--tonal" @click="refresh()">{{ t('home.reload') }}</button>
    </AppEmptyState>

    <template v-else>
      <section class="theme-section">
        <div class="section-heading">
          <div><p class="eyebrow">{{ t('home.latestEyebrow') }}</p><h2>{{ t('home.latestTitle') }}</h2><p>{{ t('home.latestDescription') }}</p></div>
          <NuxtLink to="/themes" class="button button--text">{{ t('home.viewAll') }} <Icon name="material-symbols:arrow-forward" size="19" /></NuxtLink>
        </div>
        <div v-if="data?.latest.length" class="theme-grid">
          <ThemeCard v-for="theme in data.latest" :key="theme.id" :theme="theme" />
        </div>
        <AppEmptyState v-else icon="material-symbols:palette-outline" :title="t('home.emptyTitle')" :description="t('home.emptyDescription')">
          <NuxtLink to="/upload" class="button">{{ t('home.emptyAction') }}</NuxtLink>
        </AppEmptyState>
      </section>

      <section v-if="data?.popular.length" class="theme-section">
        <div class="section-heading">
          <div><p class="eyebrow">{{ t('home.popularEyebrow') }}</p><h2>{{ t('home.popularTitle') }}</h2><p>{{ t('home.popularDescription') }}</p></div>
          <NuxtLink to="/themes?sort=downloads" class="button button--text">{{ t('home.popularLink') }} <Icon name="material-symbols:arrow-forward" size="19" /></NuxtLink>
        </div>
        <div class="theme-grid">
          <ThemeCard v-for="theme in data.popular" :key="theme.id" :theme="theme" />
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  min-height: 480px;
  padding: 40px 0 56px;
  align-items: center;
  grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
  gap: clamp(40px, 8vw, 96px);
}

.hero__copy h1 {
  margin-bottom: 24px;
  font-size: clamp(44px, 6vw, 72px);
  font-weight: 720;
  letter-spacing: -0.055em;
  line-height: 1.06;
}

.hero__copy h1 span {
  color: var(--md-primary);
}

.hero__description {
  max-width: 580px;
  margin-bottom: 28px;
  color: var(--md-on-surface-variant);
  font-size: 17px;
  line-height: 1.8;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.hero__guide {
  display: inline-flex;
  margin-top: 24px;
  align-items: center;
  gap: 5px;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  text-decoration: none;
}

.hero__art {
  position: relative;
  min-width: 0;
  padding: 36px 12px 44px 32px;
}

.hero__orb {
  position: absolute;
  inset: 0;
  border-radius: 42% 58% 62% 38% / 45% 38% 62% 55%;
  background: var(--md-primary-container);
  opacity: 0.55;
  transform: rotate(-6deg);
}

.hero__dashboard {
  position: relative;
  z-index: 1;
  padding: 18px;
  border: 1px solid color-mix(in srgb, var(--md-outline-variant) 60%, transparent);
  border-radius: 24px;
  background: var(--md-surface-container-lowest);
  box-shadow: 0 18px 44px var(--md-shadow);
  transform: rotate(2deg);
}

.hero__dashboard-top {
  display: flex;
  height: 24px;
  align-items: center;
  gap: 10px;
}

.hero__dashboard-top i {
  width: 20px;
  height: 20px;
  border-radius: 7px;
  background: var(--md-primary);
}

.hero__dashboard-top span {
  width: 35%;
  height: 6px;
  border-radius: 6px;
  background: var(--md-surface-container-highest);
}

.hero__dashboard-top b {
  width: 20px;
  height: 20px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--md-secondary-container);
}

.hero__dashboard-body {
  display: grid;
  margin-top: 14px;
  grid-template-columns: 1.3fr 1fr;
  gap: 12px;
}

.hero__welcome {
  display: flex;
  min-height: 190px;
  padding: 24px;
  border-radius: 16px;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  grid-row: span 2;
  flex-direction: column;
}

.hero__welcome small {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.hero__welcome strong {
  margin-top: 12px;
  font-size: 23px;
}

.hero__welcome span {
  width: 52px;
  height: 20px;
  margin-top: auto;
  border-radius: 999px;
  background: var(--md-primary);
}

.hero__metric {
  display: flex;
  padding: 16px;
  border-radius: 14px;
  align-items: center;
  gap: 10px;
  background: var(--md-surface-container-low);
}

.hero__metric i {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--md-secondary-container);
}

.hero__metric span {
  width: 38%;
  height: 6px;
  border-radius: 6px;
  background: var(--md-surface-container-highest);
}

.hero__metric b {
  width: 16px;
  height: 16px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--md-primary);
}

.hero__palette {
  position: absolute;
  z-index: 2;
  right: -12px;
  bottom: 16px;
  display: flex;
  padding: 10px;
  border-radius: 999px;
  background: var(--md-surface-container-lowest);
  box-shadow: 0 5px 18px var(--md-shadow);
  gap: 7px;
}

.hero__palette span {
  width: 27px;
  height: 27px;
  border: 1px solid var(--md-outline-variant);
  border-radius: 50%;
}

.hero__floating-chip {
  position: absolute;
  z-index: 2;
  bottom: 40px;
  left: 0;
  display: flex;
  padding: 10px 16px;
  border-radius: 12px;
  align-items: center;
  gap: 6px;
  background: var(--md-inverse-surface);
  color: var(--md-inverse-on-surface);
  box-shadow: 0 5px 18px var(--md-shadow);
  font-size: 12px;
  font-weight: 600;
}

.trust-strip {
  display: grid;
  margin: 8px 0 64px;
  padding: 24px 28px;
  border-radius: var(--md-radius-large);
  background: var(--md-surface-container-low);
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.trust-strip > div {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--md-primary);
}

.trust-strip span {
  display: flex;
  flex-direction: column;
}

.trust-strip strong {
  color: var(--md-on-surface);
  font-size: 14px;
}

.trust-strip small {
  margin-top: 2px;
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.theme-section {
  margin-top: 56px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.home-skeleton {
  aspect-ratio: 0.82;
  border-radius: var(--md-radius-large);
}

@media (max-width: 1080px) {
  .theme-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 0.85fr);
    gap: 32px;
  }
}

@media (max-width: 800px) {
  .hero {
    padding-top: 16px;
    grid-template-columns: 1fr;
  }

  .hero__art {
    width: min(480px, 100%);
    margin: 0 auto;
  }

  .trust-strip {
    align-items: start;
    grid-template-columns: 1fr;
  }

  .trust-strip > div {
    justify-content: flex-start;
  }
}

@media (max-width: 540px) {
  .hero__copy h1 {
    font-size: 46px;
  }

  .hero__description {
    font-size: 15px;
  }

  .hero__art {
    padding-left: 12px;
  }

  .hero__floating-chip {
    left: -4px;
  }

  .hero__palette {
    right: 0;
  }

  .theme-grid {
    grid-template-columns: 1fr;
  }

  .theme-section {
    margin-top: 40px;
  }

  .trust-strip {
    margin-bottom: 32px;
    padding: 20px;
  }
}
</style>
