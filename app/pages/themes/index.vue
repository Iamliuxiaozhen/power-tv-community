<script setup lang="ts">
import type { ThemeListResponse } from '#shared/community'

const { t } = useI18n()
const route = useRoute()
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const sort = computed(() => typeof route.query.sort === 'string' && ['downloads', 'likes'].includes(route.query.sort) ? route.query.sort : 'latest')
const query = computed(() => ({
  q: typeof route.query.q === 'string' ? route.query.q : undefined,
  sort: sort.value,
  cursor: typeof route.query.cursor === 'string' ? route.query.cursor : undefined,
  limit: 12,
}))
const { data, pending, error, refresh } = await useAsyncData(
  'theme-catalog',
  () => $fetch<ThemeListResponse>('/api/themes', { query: query.value }),
  { watch: [query] },
)

useHead({ title: computed(() => query.value.q ? t('catalog.searchTitle', { query: query.value.q }) : t('catalog.metaTitle')) })
watch(() => route.query.q, value => { search.value = typeof value === 'string' ? value : '' })

function submitSearch() {
  const q = search.value.trim()
  navigateTo({ path: '/themes', query: { q: q || undefined, sort: sort.value === 'latest' ? undefined : sort.value } })
}

function changeSort(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  navigateTo({ path: '/themes', query: { q: query.value.q, sort: value === 'latest' ? undefined : value } })
}
</script>

<template>
  <div class="catalog-page">
    <header class="catalog-header">
      <div>
        <p class="eyebrow">{{ t('catalog.eyebrow') }}</p>
        <h1>{{ t('catalog.title') }}</h1>
        <p>{{ t('catalog.description') }}</p>
      </div>
      <NuxtLink to="/upload" class="button"><Icon name="material-symbols:add" size="20" /> {{ t('catalog.publish') }}</NuxtLink>
    </header>

    <section class="catalog-controls" :aria-label="t('catalog.filters')">
      <form class="catalog-search" role="search" @submit.prevent="submitSearch">
        <Icon name="material-symbols:search" size="22" aria-hidden="true" />
        <label for="theme-search" class="visually-hidden">{{ t('catalog.searchLabel') }}</label>
        <input id="theme-search" v-model="search" type="search" maxlength="100" :placeholder="t('catalog.searchPlaceholder')">
        <button v-if="search" type="button" class="icon-button" :aria-label="t('catalog.clearSearch')" @click="search = ''; submitSearch()">
          <Icon name="material-symbols:close" size="20" />
        </button>
        <button type="submit" class="button button--small">{{ t('catalog.search') }}</button>
      </form>
      <label class="catalog-sort">
        <Icon name="material-symbols:sort" size="20" />
        <span class="visually-hidden">{{ t('catalog.sortLabel') }}</span>
        <select :value="sort" :aria-label="t('catalog.sortLabel')" @change="changeSort">
          <option value="latest">{{ t('catalog.sortLatest') }}</option>
          <option value="downloads">{{ t('catalog.sortDownloads') }}</option>
          <option value="likes">{{ t('catalog.sortLikes') }}</option>
        </select>
        <Icon name="material-symbols:expand-more" size="19" />
      </label>
    </section>

    <div class="catalog-result-meta" aria-live="polite">
      <span v-if="query.q">{{ t('catalog.resultsFor', { query: query.q }) }}</span>
      <span v-else>{{ t('catalog.allThemes') }}</span>
      <span v-if="data && !pending">{{ t('catalog.themeCount', { count: data.items.length }) }}</span>
    </div>

    <div v-if="pending" class="catalog-grid">
      <div v-for="index in 6" :key="index" class="catalog-skeleton skeleton" />
    </div>
    <AppEmptyState v-else-if="error" icon="material-symbols:cloud-off" :title="t('catalog.loadErrorTitle')" :description="t('catalog.loadErrorDescription')">
      <button type="button" class="button button--tonal" @click="refresh()">{{ t('common.retry') }}</button>
    </AppEmptyState>
    <AppEmptyState v-else-if="!data?.items.length" icon="material-symbols:search-off" :title="query.q ? t('catalog.noMatchTitle') : t('catalog.emptyTitle')" :description="query.q ? t('catalog.noMatchDescription') : t('catalog.emptyDescription')">
      <NuxtLink v-if="query.q" to="/themes" class="button button--tonal">{{ t('catalog.viewAll') }}</NuxtLink>
      <NuxtLink v-else to="/upload" class="button">{{ t('catalog.emptyAction') }}</NuxtLink>
    </AppEmptyState>
    <template v-else>
      <div class="catalog-grid">
        <ThemeCard v-for="theme in data.items" :key="theme.id" :theme="theme" />
      </div>
      <nav v-if="query.cursor || data.nextCursor" class="catalog-pagination" :aria-label="t('catalog.pagination')">
        <button v-if="query.cursor" type="button" class="button button--outlined" @click="$router.back()">
          <Icon name="material-symbols:arrow-back" size="19" /> {{ t('common.previous') }}
        </button>
        <NuxtLink v-if="data.nextCursor" :to="{ path: '/themes', query: { ...query, cursor: data.nextCursor } }" class="button button--tonal">
          {{ t('common.next') }} <Icon name="material-symbols:arrow-forward" size="19" />
        </NuxtLink>
      </nav>
    </template>
  </div>
</template>

<style scoped>
.catalog-header {
  display: flex;
  padding: 24px 0 32px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.catalog-header h1 {
  margin-bottom: 12px;
  font-size: clamp(32px, 5vw, 48px);
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.catalog-header > div > p:last-child {
  margin-bottom: 0;
  color: var(--md-on-surface-variant);
}

.catalog-controls {
  display: flex;
  margin-bottom: 20px;
  gap: 12px;
}

.catalog-search {
  display: flex;
  min-width: 0;
  min-height: 56px;
  padding: 6px 6px 6px 16px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  align-items: center;
  background: var(--md-surface-container-lowest);
  color: var(--md-on-surface-variant);
  flex: 1;
  gap: 10px;
}

.catalog-search:focus-within {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 1px var(--md-primary);
}

.catalog-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--md-on-surface);
}

.catalog-search input::-webkit-search-cancel-button {
  display: none;
}

.catalog-sort {
  display: flex;
  min-height: 56px;
  padding: 0 16px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  align-items: center;
  background: var(--md-surface-container-low);
  color: var(--md-on-surface-variant);
  gap: 8px;
}

.catalog-sort select {
  border: 0;
  outline: 0;
  appearance: none;
  background: transparent;
  font-size: 14px;
  font-weight: 550;
}

.catalog-sort:focus-within {
  outline: 3px solid var(--md-primary);
  outline-offset: 2px;
}

.catalog-sort option {
  background: var(--md-surface-container);
  color: var(--md-on-surface);
}

.catalog-result-meta {
  display: flex;
  margin: 24px 0 16px;
  justify-content: space-between;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  gap: 16px;
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.catalog-skeleton {
  aspect-ratio: 0.83;
  border-radius: var(--md-radius-large);
}

.catalog-pagination {
  display: flex;
  margin-top: 36px;
  justify-content: center;
  gap: 12px;
}

@media (max-width: 1000px) {
  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .catalog-header {
    padding-top: 8px;
    align-items: flex-start;
    flex-direction: column;
  }

  .catalog-controls {
    flex-direction: column;
  }

  .catalog-sort {
    align-self: flex-end;
  }

  .catalog-search {
    padding-left: 12px;
    gap: 6px;
  }

  .catalog-search .button {
    padding-inline: 14px;
  }

  .catalog-grid {
    grid-template-columns: 1fr;
  }
}
</style>
