<script setup lang="ts">
import type { ThemeDetailResponse, ThemeSummary } from '#shared/community'

const { t } = useI18n()
const route = useRoute()
const { loggedIn, loginUrl, ready, user } = useAuth()
const themeId = computed(() => typeof route.params.themeId === 'string' ? route.params.themeId : undefined)
const { data: theme, pending, error } = await useAsyncData<ThemeSummary | null>(
  'upload-theme',
  async () => {
    if (!themeId.value) return null
    const response = await $fetch<ThemeDetailResponse>(`/api/themes/${encodeURIComponent(themeId.value)}`)
    return response.theme
  },
  { watch: [themeId] },
)
const isOwner = computed(() => Boolean(theme.value && user.value?.githubId === theme.value.owner.githubId))

useHead({
  title: computed(() => theme.value ? t('upload.metaUpdateTitle', { name: theme.value.name }) : t('upload.metaTitle')),
  meta: [{ name: 'description', content: computed(() => t('upload.metaDescription')) }],
})
</script>

<template>
  <div class="upload-page">
    <div v-if="!ready || (themeId && pending)" class="upload-loading" :aria-label="t('upload.loading')">
      <div class="upload-loading__title skeleton" />
      <div class="upload-loading__form skeleton" />
      <div class="upload-loading__aside skeleton" />
    </div>

    <AppEmptyState
      v-else-if="!loggedIn"
      icon="material-symbols:account-circle-outline"
      :title="t('upload.loginTitle')"
      :description="t('upload.loginDescription')"
    >
      <a :href="loginUrl()" class="button"><Icon name="material-symbols:login" size="20" /> {{ t('upload.continueWithGithub') }}</a>
      <NuxtLink to="/themes" class="button button--outlined">{{ t('upload.browseFirst') }}</NuxtLink>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="themeId && error"
      icon="material-symbols:search-off"
      :title="t('upload.notFoundTitle')"
      :description="t('upload.notFoundDescription')"
    >
      <NuxtLink to="/themes" class="button button--tonal">{{ t('upload.backToCatalog') }}</NuxtLink>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="themeId && theme && !isOwner"
      icon="material-symbols:lock-outline"
      :title="t('upload.notOwnerTitle')"
      :description="t('upload.notOwnerDescription')"
    >
      <NuxtLink :to="`/themes/${encodeURIComponent(theme.id)}`" class="button button--outlined">{{ t('upload.backToDetail') }}</NuxtLink>
      <NuxtLink to="/upload" class="button">{{ t('upload.publishNew') }}</NuxtLink>
    </AppEmptyState>

    <template v-else>
      <nav class="upload-breadcrumb" :aria-label="t('upload.breadcrumb')">
        <NuxtLink :to="theme ? `/themes/${encodeURIComponent(theme.id)}` : '/themes'">
          <Icon name="material-symbols:arrow-back" size="18" /> {{ theme ? t('upload.backToDetail') : t('upload.catalog') }}
        </NuxtLink>
      </nav>

      <header class="upload-header">
        <p class="eyebrow">{{ theme ? t('upload.eyebrowUpdate') : t('upload.eyebrowNew') }}</p>
        <h1>{{ theme ? t('upload.titleUpdate', { name: theme.name }) : t('upload.titleNew') }}</h1>
        <p>{{ theme ? t('upload.descriptionUpdate') : t('upload.descriptionNew') }}</p>
      </header>

      <div class="upload-layout">
        <ThemeUploadForm
          :key="theme?.id ?? 'new-theme'"
          :theme-id="theme?.id"
          :theme-name="theme?.name"
          :current-version="theme?.version"
        />

        <aside class="upload-guide" :aria-label="t('upload.guideAria')">
          <section class="card upload-guide__section">
            <span class="upload-guide__number">01</span>
            <h2>{{ t('upload.step1Title') }}</h2>
            <p>{{ t('upload.step1Description') }}</p>
          </section>
          <section class="card upload-guide__section">
            <span class="upload-guide__number">02</span>
            <h2>{{ t('upload.step2Title') }}</h2>
            <p>{{ t('upload.step2Description') }}</p>
            <ul>
              <li>{{ t('upload.step2Bullet1') }}</li>
              <li>{{ t('upload.step2Bullet2') }}</li>
              <li>{{ t('upload.step2Bullet3') }}</li>
            </ul>
          </section>
          <section class="card upload-guide__section">
            <span class="upload-guide__number">03</span>
            <h2>{{ t('upload.step3Title') }}</h2>
            <p>{{ t('upload.step3Description') }}</p>
          </section>
          <a href="https://github.com/Iamliuxiaozhen/power-tv/tree/main/docs/theme-pack" target="_blank" rel="noreferrer" class="upload-docs">
            <Icon name="material-symbols:menu-book-outline" size="22" />
            <span><strong>{{ t('upload.docsTitle') }}</strong><small>{{ t('upload.docsDescription') }}</small></span>
            <Icon name="material-symbols:open-in-new" size="18" />
          </a>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.upload-breadcrumb {
  margin-bottom: 24px;
}

.upload-breadcrumb a {
  display: inline-flex;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  gap: 6px;
  text-decoration: none;
}

.upload-breadcrumb a:hover {
  color: var(--md-primary);
}

.upload-header {
  max-width: 780px;
  margin-bottom: 36px;
}

.upload-header h1 {
  margin-bottom: 14px;
  font-size: clamp(34px, 5vw, 52px);
  letter-spacing: -0.04em;
  line-height: 1.14;
}

.upload-header > p:last-child {
  margin-bottom: 0;
  color: var(--md-on-surface-variant);
  font-size: 16px;
  line-height: 1.7;
}

.upload-layout {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 28px;
}

.upload-guide {
  display: grid;
  gap: 14px;
}

.upload-guide__section {
  padding: 20px;
}

.upload-guide__number {
  display: block;
  margin-bottom: 12px;
  color: var(--md-primary);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.upload-guide__section h2 {
  margin-bottom: 8px;
  font-size: 17px;
}

.upload-guide__section p,
.upload-guide__section li {
  color: var(--md-on-surface-variant);
  font-size: 12px;
  line-height: 1.7;
}

.upload-guide__section p {
  margin-bottom: 0;
}

.upload-guide__section ul {
  margin: 10px 0 0;
  padding-left: 18px;
}

.upload-docs {
  display: grid;
  padding: 16px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  align-items: center;
  color: var(--md-on-surface);
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  text-decoration: none;
}

.upload-docs:hover {
  background: var(--md-surface-container-low);
}

.upload-docs > span {
  display: flex;
  flex-direction: column;
}

.upload-docs strong {
  font-size: 13px;
}

.upload-docs small {
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.upload-loading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
}

.upload-loading__title {
  height: 150px;
  margin-bottom: 20px;
  border-radius: 24px;
  grid-column: 1 / -1;
}

.upload-loading__form {
  height: 540px;
  border-radius: 24px;
}

.upload-loading__aside {
  height: 420px;
  border-radius: 24px;
}

@media (max-width: 960px) {
  .upload-layout,
  .upload-loading {
    grid-template-columns: minmax(0, 1fr) 270px;
    gap: 20px;
  }
}

@media (max-width: 760px) {
  .upload-layout,
  .upload-loading {
    grid-template-columns: 1fr;
  }

  .upload-guide {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .upload-docs {
    align-self: stretch;
  }
}

@media (max-width: 560px) {
  .upload-header {
    margin-bottom: 28px;
  }

  .upload-header h1 {
    font-size: 34px;
  }

  .upload-guide {
    grid-template-columns: 1fr;
  }
}
</style>
