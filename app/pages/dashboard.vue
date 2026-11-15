<script setup lang="ts">
import type { DashboardResponse } from '#shared/community'

const route = useRoute()
const { loggedIn, loginUrl, ready, user } = useAuth()
const tab = computed(() => {
  const value = route.query.tab
  return value === 'likes' || value === 'favorites' ? value : 'themes'
})
const cursor = computed(() => typeof route.query.cursor === 'string' ? route.query.cursor : undefined)
const { data, pending, error, refresh } = await useAsyncData<DashboardResponse | null>(
  'personal-dashboard',
  () => loggedIn.value
    ? $fetch<DashboardResponse>('/api/me/dashboard', { query: { cursor: cursor.value, limit: 12 } })
    : Promise.resolve(null),
  { watch: [cursor, loggedIn] },
)

useHead({ title: '个人面板' })
</script>

<template>
  <div class="dashboard-page">
    <div v-if="!ready || (loggedIn && pending && !data)" class="dashboard-loading" aria-label="正在加载个人面板">
      <div class="dashboard-loading__header skeleton" />
      <div class="dashboard-loading__stats skeleton" />
      <div class="dashboard-loading__content skeleton" />
    </div>

    <AppEmptyState
      v-else-if="!loggedIn"
      icon="material-symbols:account-circle-outline"
      title="登录后打开个人面板"
      description="查看你发布的主题、收藏的作品，以及下载和点赞统计。"
    >
      <a :href="loginUrl()" class="button"><Icon name="material-symbols:login" size="20" /> 使用 GitHub 继续</a>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="error && !data"
      icon="material-symbols:cloud-off"
      title="个人面板加载失败"
      description="暂时无法读取你的主题和收藏，请稍后重试。"
    >
      <button type="button" class="button button--tonal" @click="refresh()">重试</button>
    </AppEmptyState>

    <template v-else-if="data && user">
      <header class="dashboard-header">
        <div class="dashboard-identity">
          <img :src="user.avatarUrl" :alt="`${user.login} 的 GitHub 头像`" width="76" height="76">
          <div>
            <p class="eyebrow">CREATOR DASHBOARD</p>
            <h1>{{ user.displayName || user.login }}</h1>
            <a :href="user.githubUrl" target="_blank" rel="noreferrer">@{{ user.login }} <Icon name="material-symbols:open-in-new" size="15" /></a>
          </div>
        </div>
        <NuxtLink to="/upload" class="button"><Icon name="material-symbols:add" size="20" /> 发布新主题</NuxtLink>
      </header>

      <section class="dashboard-stats" aria-label="创作统计">
        <article class="card">
          <span><Icon name="material-symbols:palette-outline" size="23" /></span>
          <div><strong>{{ data.stats.themes }}</strong><small>我的主题</small></div>
        </article>
        <article class="card">
          <span><Icon name="material-symbols:bookmark-outline" size="23" /></span>
          <div><strong>{{ data.stats.favorites }}</strong><small>我的收藏</small></div>
        </article>
        <article class="card">
          <span><Icon name="material-symbols:download" size="23" /></span>
          <div><strong>{{ data.stats.downloads }}</strong><small>累计下载</small></div>
        </article>
        <article class="card">
          <span><Icon name="material-symbols:favorite-outline" size="23" /></span>
          <div><strong>{{ data.stats.likes }}</strong><small>收到点赞</small></div>
        </article>
      </section>

      <nav class="dashboard-tabs" aria-label="个人主题列表">
        <NuxtLink :to="{ query: {} }" :class="{ 'is-active': tab === 'themes' }" :aria-current="tab === 'themes' ? 'page' : undefined">
          <Icon name="material-symbols:deployed-code-outline" size="20" /> 我的发布
          <span>{{ data.stats.themes }}</span>
        </NuxtLink>
        <NuxtLink :to="{ query: { tab: 'likes' } }" :class="{ 'is-active': tab === 'likes' }" :aria-current="tab === 'likes' ? 'page' : undefined">
          <Icon name="material-symbols:favorite-outline" size="20" /> 我的点赞
          <span>{{ data.liked.length }}</span>
        </NuxtLink>
        <NuxtLink :to="{ query: { tab: 'favorites' } }" :class="{ 'is-active': tab === 'favorites' }" :aria-current="tab === 'favorites' ? 'page' : undefined">
          <Icon name="material-symbols:bookmark-outline" size="20" /> 我的收藏
          <span>{{ data.stats.favorites }}</span>
        </NuxtLink>
      </nav>

      <section class="dashboard-content" :aria-label="tab === 'themes' ? '我的发布' : tab === 'likes' ? '我的点赞' : '我的收藏'">
        <div v-if="pending" class="dashboard-grid">
          <div v-for="index in 3" :key="index" class="dashboard-skeleton skeleton" />
        </div>
        <AppEmptyState v-else-if="error" icon="material-symbols:cloud-off" title="列表加载失败">
          <button type="button" class="button button--tonal" @click="refresh()">重试</button>
        </AppEmptyState>

        <template v-else-if="tab === 'themes'">
          <AppEmptyState
            v-if="!data.themes.items.length"
            icon="material-symbols:palette-outline"
            title="还没有发布主题"
            description="上传第一个主题包，让更多人发现你的配色与创意。"
          >
            <NuxtLink to="/upload" class="button">发布主题</NuxtLink>
          </AppEmptyState>
          <template v-else>
            <div class="dashboard-grid">
              <div v-for="theme in data.themes.items" :key="theme.id" class="dashboard-theme">
                <ThemeCard :theme="theme" />
                <div class="dashboard-theme__manage">
                  <span class="chip" :class="{ 'chip--selected': theme.status === 'published' }">
                    <Icon :name="theme.status === 'published' ? 'material-symbols:public' : 'material-symbols:visibility-off-outline'" size="16" />
                    {{ theme.status === 'published' ? '公开' : '已隐藏' }}
                  </span>
                  <NuxtLink v-if="theme.status === 'published'" :to="`/upload/${encodeURIComponent(theme.id)}`">
                    管理主题 <Icon name="material-symbols:arrow-forward" size="16" />
                  </NuxtLink>
                </div>
              </div>
            </div>
            <nav v-if="cursor || data.themes.nextCursor" class="dashboard-pagination" aria-label="我的发布分页">
              <button v-if="cursor" type="button" class="button button--outlined" @click="$router.back()">
                <Icon name="material-symbols:arrow-back" size="19" /> 上一页
              </button>
              <NuxtLink v-if="data.themes.nextCursor" :to="{ query: { cursor: data.themes.nextCursor } }" class="button button--tonal">
                下一页 <Icon name="material-symbols:arrow-forward" size="19" />
              </NuxtLink>
            </nav>
          </template>
        </template>

        <template v-else-if="tab === 'favorites'">
          <AppEmptyState
            v-if="!data.favorites.length"
            icon="material-symbols:bookmark-outline"
            title="收藏夹还是空的"
            description="在主题详情页点击收藏，之后可以从这里快速找到它。"
          >
            <NuxtLink to="/themes" class="button button--tonal">浏览主题</NuxtLink>
          </AppEmptyState>
          <div v-else class="dashboard-grid">
            <ThemeCard v-for="theme in data.favorites" :key="theme.id" :theme="theme" />
          </div>
        </template>

        <template v-else>
          <AppEmptyState
            v-if="!data.liked.length"
            icon="material-symbols:favorite-outline"
            title="还没有点赞主题"
            description="在主题详情页点亮心形按钮，把喜欢的作品加入这个列表。"
          >
            <NuxtLink to="/themes" class="button button--tonal">发现主题</NuxtLink>
          </AppEmptyState>
          <div v-else class="dashboard-grid">
            <ThemeCard v-for="theme in data.liked" :key="theme.id" :theme="theme" />
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
.dashboard-header {
  display: flex;
  margin: 8px 0 28px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.dashboard-identity {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 20px;
}

.dashboard-identity > img {
  width: 76px;
  height: 76px;
  border: 3px solid var(--md-surface-container-lowest);
  border-radius: 24px;
  object-fit: cover;
  box-shadow: 0 2px 8px var(--md-shadow);
}

.dashboard-identity h1 {
  margin-bottom: 3px;
  font-size: clamp(28px, 4vw, 40px);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.dashboard-identity .eyebrow {
  margin-bottom: 5px;
}

.dashboard-identity a {
  display: inline-flex;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  gap: 4px;
  text-decoration: none;
}

.dashboard-stats {
  display: grid;
  margin-bottom: 32px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.dashboard-stats article {
  display: flex;
  padding: 20px;
  align-items: center;
  gap: 13px;
}

.dashboard-stats article > span {
  display: inline-flex;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  flex: 0 0 auto;
}

.dashboard-stats article > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.dashboard-stats strong {
  font-size: 25px;
  line-height: 1.2;
}

.dashboard-stats small {
  margin-top: 3px;
  color: var(--md-on-surface-variant);
  font-size: 12px;
}

.dashboard-tabs {
  display: flex;
  border-bottom: 1px solid var(--md-outline-variant);
  gap: 8px;
}

.dashboard-tabs a {
  position: relative;
  display: inline-flex;
  min-height: 52px;
  padding: 10px 20px;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 14px;
  font-weight: 600;
  gap: 8px;
  text-decoration: none;
}

.dashboard-tabs a::after {
  position: absolute;
  right: 16px;
  bottom: 0;
  left: 16px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--md-primary);
  content: '';
  opacity: 0;
}

.dashboard-tabs a.is-active {
  color: var(--md-primary);
}

.dashboard-tabs a.is-active::after {
  opacity: 1;
}

.dashboard-tabs a > span {
  min-width: 24px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--md-surface-container-high);
  font-size: 11px;
  text-align: center;
}

.dashboard-content {
  padding-top: 28px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.dashboard-theme {
  display: flex;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--md-radius-large);
  flex-direction: column;
}

.dashboard-theme > article {
  flex: 1;
  border-radius: 0;
}

.dashboard-theme__manage {
  display: flex;
  min-height: 56px;
  padding: 10px 16px;
  align-items: center;
  justify-content: space-between;
  background: var(--md-surface-container-low);
  gap: 12px;
}

.dashboard-theme__manage .chip {
  min-height: 28px;
  padding: 3px 9px;
  font-size: 11px;
}

.dashboard-theme__manage > a {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
  gap: 4px;
  text-decoration: none;
}

.dashboard-pagination {
  display: flex;
  margin-top: 36px;
  justify-content: center;
  gap: 12px;
}

.dashboard-skeleton {
  aspect-ratio: 0.83;
  border-radius: var(--md-radius-large);
}

.dashboard-loading {
  display: grid;
  gap: 24px;
}

.dashboard-loading__header {
  height: 100px;
  border-radius: 24px;
}

.dashboard-loading__stats {
  height: 90px;
  border-radius: 20px;
}

.dashboard-loading__content {
  height: 440px;
  border-radius: 24px;
}

@media (max-width: 1000px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .dashboard-identity > img {
    width: 64px;
    height: 64px;
    border-radius: 20px;
  }

  .dashboard-stats {
    gap: 10px;
  }

  .dashboard-stats article {
    padding: 16px;
  }

  .dashboard-stats article > span {
    width: 38px;
    height: 38px;
  }

  .dashboard-tabs a {
    padding-inline: 12px;
    flex: 1;
    justify-content: center;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .dashboard-tabs {
    gap: 0;
  }

  .dashboard-tabs a {
    min-width: 0;
    padding-inline: 8px;
    font-size: 12px;
    gap: 6px;
  }

  .dashboard-tabs a > span {
    display: none;
  }
}

@media (max-width: 380px) {
  .dashboard-stats article > span {
    display: none;
  }
}
</style>
