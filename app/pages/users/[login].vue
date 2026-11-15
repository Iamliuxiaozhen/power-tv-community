<script setup lang="ts">
import type { UserThemesResponse } from '#shared/community'

const { t } = useI18n()
const route = useRoute()
const login = computed(() => String(route.params.login))
const cursor = computed(() => typeof route.query.cursor === 'string' ? route.query.cursor : undefined)
const { data, pending, error, refresh } = await useAsyncData(
  'public-user-themes',
  () => $fetch<UserThemesResponse>(`/api/users/${encodeURIComponent(login.value)}/themes`, {
    query: { cursor: cursor.value, limit: 12 },
  }),
  { watch: [login, cursor] },
)

useHead({ title: computed(() => data.value ? t('profile.metaUserTitle', { name: data.value.user.displayName || data.value.user.login }) : t('profile.metaTitle')) })
</script>

<template>
  <div class="profile-page">
    <div v-if="pending && !data" class="profile-header profile-header--loading">
      <div class="profile-avatar skeleton" />
      <div class="profile-lines"><span class="skeleton" /><span class="skeleton" /></div>
    </div>
    <AppEmptyState v-else-if="error && !data" icon="material-symbols:person-off-outline" :title="t('profile.loadErrorTitle')" :description="t('profile.loadErrorDescription')">
      <button type="button" class="button button--tonal" @click="refresh()">{{ t('common.retry') }}</button>
      <NuxtLink to="/themes" class="button button--text">{{ t('themeDetail.backToCatalog') }}</NuxtLink>
    </AppEmptyState>

    <template v-else-if="data">
      <header class="profile-header">
        <img class="profile-avatar" :src="data.user.avatarUrl" :alt="t('profile.avatarAlt', { login: data.user.login })" width="112" height="112">
        <div class="profile-identity">
          <p class="eyebrow">{{ t('profile.eyebrow') }}</p>
          <h1>{{ data.user.displayName || data.user.login }}</h1>
          <p class="profile-login">@{{ data.user.login }}</p>
          <div class="profile-links">
            <a :href="data.user.githubUrl" target="_blank" rel="noreferrer" class="button button--outlined button--small">
              <Icon name="material-symbols:person-outline" size="19" /> {{ t('profile.githubProfile') }}
              <Icon name="material-symbols:open-in-new" size="15" />
            </a>
            <span><Icon name="material-symbols:calendar-month-outline" size="18" /> {{ t('profile.joined', { date: data.user.createdAt.slice(0, 10) }) }}</span>
          </div>
        </div>
        <div class="profile-stat"><strong>{{ data.items.length }}{{ data.nextCursor ? '+' : '' }}</strong><span>{{ t('profile.publicThemes') }}</span></div>
      </header>

      <section class="profile-themes">
        <div class="section-heading"><div><h2>{{ t('profile.themesTitle') }}</h2><p>{{ t('profile.themesDescription', { login: data.user.login }) }}</p></div></div>
        <div v-if="pending" class="profile-grid"><div v-for="index in 3" :key="index" class="profile-skeleton skeleton" /></div>
        <AppEmptyState v-else-if="error" icon="material-symbols:cloud-off" :title="t('profile.themesLoadError')">
          <button type="button" class="button button--tonal" @click="refresh()">{{ t('common.retry') }}</button>
        </AppEmptyState>
        <AppEmptyState v-else-if="!data.items.length" icon="material-symbols:palette-outline" :title="t('profile.emptyTitle')" :description="t('profile.emptyDescription')" />
        <template v-else>
          <div class="profile-grid"><ThemeCard v-for="theme in data.items" :key="theme.id" :theme="theme" /></div>
          <nav v-if="cursor || data.nextCursor" class="profile-pagination" :aria-label="t('profile.pagination')">
            <button v-if="cursor" type="button" class="button button--outlined" @click="$router.back()"><Icon name="material-symbols:arrow-back" size="19" /> {{ t('common.previous') }}</button>
            <NuxtLink v-if="data.nextCursor" :to="{ query: { cursor: data.nextCursor } }" class="button button--tonal">{{ t('common.next') }} <Icon name="material-symbols:arrow-forward" size="19" /></NuxtLink>
          </nav>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
.profile-header {
  display: flex;
  margin: 16px 0 56px;
  padding: 36px;
  border-radius: var(--md-radius-extra-large);
  align-items: center;
  background: var(--md-surface-container-low);
  gap: 28px;
}

.profile-avatar {
  width: 112px;
  height: 112px;
  border: 4px solid var(--md-surface-container-lowest);
  border-radius: 32px;
  object-fit: cover;
  flex: 0 0 auto;
  box-shadow: 0 3px 12px var(--md-shadow);
}

.profile-identity {
  min-width: 0;
}

.profile-identity h1 {
  margin-bottom: 2px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.profile-login {
  margin-bottom: 16px;
  color: var(--md-on-surface-variant);
}

.profile-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.profile-links > span {
  display: inline-flex;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  gap: 6px;
}

.profile-stat {
  display: flex;
  min-width: 100px;
  margin-left: auto;
  padding-left: 28px;
  border-left: 1px solid var(--md-outline-variant);
  align-items: center;
  flex-direction: column;
}

.profile-stat strong {
  color: var(--md-primary);
  font-size: 32px;
}

.profile-stat span {
  color: var(--md-on-surface-variant);
  font-size: 13px;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.profile-skeleton {
  aspect-ratio: 0.83;
  border-radius: var(--md-radius-large);
}

.profile-pagination {
  display: flex;
  margin-top: 36px;
  justify-content: center;
  gap: 12px;
}

.profile-header--loading {
  min-height: 184px;
}

.profile-lines {
  display: grid;
  width: min(360px, 60%);
  gap: 16px;
}

.profile-lines span {
  height: 26px;
  border-radius: 8px;
}

.profile-lines span:last-child {
  width: 65%;
  height: 16px;
}

@media (max-width: 1000px) {
  .profile-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .profile-header {
    margin-top: 0;
    padding: 24px;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 20px;
  }

  .profile-avatar {
    width: 80px;
    height: 80px;
    border-radius: 24px;
  }

  .profile-identity {
    flex: 1;
  }

  .profile-links {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-stat {
    width: 100%;
    padding: 16px 0 0;
    border-top: 1px solid var(--md-outline-variant);
    border-left: 0;
    align-items: baseline;
    flex-direction: row;
    gap: 8px;
  }

  .profile-stat strong {
    font-size: 24px;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
