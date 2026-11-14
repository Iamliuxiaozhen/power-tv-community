<script setup lang="ts">
import type { ThemeListResponse } from '#shared/community'

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

useHead({ title: computed(() => query.value.q ? `搜索：${query.value.q}` : '浏览主题') })
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
        <p class="eyebrow">THEME CATALOG</p>
        <h1>寻找下一种客厅风格</h1>
        <p>搜索主题名称、ID 或描述，找到适合你的配色与布局。</p>
      </div>
      <NuxtLink to="/upload" class="button"><Icon name="material-symbols:add" size="20" /> 发布主题</NuxtLink>
    </header>

    <section class="catalog-controls" aria-label="主题筛选">
      <form class="catalog-search" role="search" @submit.prevent="submitSearch">
        <Icon name="material-symbols:search" size="22" aria-hidden="true" />
        <label for="theme-search" class="visually-hidden">搜索主题</label>
        <input id="theme-search" v-model="search" type="search" maxlength="100" placeholder="搜索主题、ID 或描述…">
        <button v-if="search" type="button" class="icon-button" aria-label="清空搜索" @click="search = ''; submitSearch()">
          <Icon name="material-symbols:close" size="20" />
        </button>
        <button type="submit" class="button button--small">搜索</button>
      </form>
      <label class="catalog-sort">
        <Icon name="material-symbols:sort" size="20" />
        <span class="visually-hidden">排序方式</span>
        <select :value="sort" aria-label="排序方式" @change="changeSort">
          <option value="latest">最新发布</option>
          <option value="downloads">下载最多</option>
          <option value="likes">点赞最多</option>
        </select>
        <Icon name="material-symbols:expand-more" size="19" />
      </label>
    </section>

    <div class="catalog-result-meta" aria-live="polite">
      <span v-if="query.q">“{{ query.q }}”的搜索结果</span>
      <span v-else>全部公开主题</span>
      <span v-if="data && !pending">{{ data.items.length }} 个主题</span>
    </div>

    <div v-if="pending" class="catalog-grid">
      <div v-for="index in 6" :key="index" class="catalog-skeleton skeleton" />
    </div>
    <AppEmptyState v-else-if="error" icon="material-symbols:cloud-off" title="主题加载失败" description="目录暂时不可用，请稍后重试。">
      <button type="button" class="button button--tonal" @click="refresh()">重试</button>
    </AppEmptyState>
    <AppEmptyState v-else-if="!data?.items.length" icon="material-symbols:search-off" :title="query.q ? '没有找到匹配的主题' : '还没有公开主题'" :description="query.q ? '试试更短的关键词，或浏览全部主题。' : '发布第一个主题，让社区从这里开始。'">
      <NuxtLink v-if="query.q" to="/themes" class="button button--tonal">查看全部主题</NuxtLink>
      <NuxtLink v-else to="/upload" class="button">发布主题</NuxtLink>
    </AppEmptyState>
    <template v-else>
      <div class="catalog-grid">
        <ThemeCard v-for="theme in data.items" :key="theme.id" :theme="theme" />
      </div>
      <nav v-if="query.cursor || data.nextCursor" class="catalog-pagination" aria-label="主题分页">
        <button v-if="query.cursor" type="button" class="button button--outlined" @click="$router.back()">
          <Icon name="material-symbols:arrow-back" size="19" /> 上一页
        </button>
        <NuxtLink v-if="data.nextCursor" :to="{ path: '/themes', query: { ...query, cursor: data.nextCursor } }" class="button button--tonal">
          下一页 <Icon name="material-symbols:arrow-forward" size="19" />
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
