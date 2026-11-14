<script setup lang="ts">
import type { ThemeDetailResponse, ThemeSummary } from '#shared/community'

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
  title: computed(() => theme.value ? `更新 ${theme.value.name}` : '发布主题'),
  meta: [{ name: 'description', content: '上传并发布 power-tv 社区主题包。' }],
})
</script>

<template>
  <div class="upload-page">
    <div v-if="!ready || (themeId && pending)" class="upload-loading" aria-label="正在加载上传页面">
      <div class="upload-loading__title skeleton" />
      <div class="upload-loading__form skeleton" />
      <div class="upload-loading__aside skeleton" />
    </div>

    <AppEmptyState
      v-else-if="!loggedIn"
      icon="material-symbols:account-circle-outline"
      title="登录后发布主题"
      description="使用 GitHub 账号登录即可上传主题。社区不会要求你创建另一套账号。"
    >
      <a :href="loginUrl()" class="button"><Icon name="material-symbols:login" size="20" /> 使用 GitHub 继续</a>
      <NuxtLink to="/themes" class="button button--outlined">先逛逛主题</NuxtLink>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="themeId && error"
      icon="material-symbols:search-off"
      title="无法更新此主题"
      description="主题可能不存在、已删除或已隐藏。请返回主题目录重新选择。"
    >
      <NuxtLink to="/themes" class="button button--tonal">返回主题目录</NuxtLink>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="themeId && theme && !isOwner"
      icon="material-symbols:lock-outline"
      title="只有原作者可以更新"
      description="主题 ID 与原作者绑定。你可以发布自己的新主题，但不能替换其他创作者的作品。"
    >
      <NuxtLink :to="`/themes/${encodeURIComponent(theme.id)}`" class="button button--outlined">返回主题详情</NuxtLink>
      <NuxtLink to="/upload" class="button">发布新主题</NuxtLink>
    </AppEmptyState>

    <template v-else>
      <nav class="upload-breadcrumb" aria-label="面包屑">
        <NuxtLink :to="theme ? `/themes/${encodeURIComponent(theme.id)}` : '/themes'">
          <Icon name="material-symbols:arrow-back" size="18" /> {{ theme ? '返回主题详情' : '主题目录' }}
        </NuxtLink>
      </nav>

      <header class="upload-header">
        <p class="eyebrow">{{ theme ? 'RELEASE A NEW VERSION' : 'CREATOR PORTAL' }}</p>
        <h1>{{ theme ? `为 ${theme.name} 发布新版本` : '把你的风格，带进更多客厅' }}</h1>
        <p>{{ theme ? '上传包含相同主题 ID 的新主题包，历史版本仍会保留。' : '上传符合 power-tv 规范的主题包，校验通过后即刻出现在社区目录。' }}</p>
      </header>

      <div class="upload-layout">
        <ThemeUploadForm
          :key="theme?.id ?? 'new-theme'"
          :theme-id="theme?.id"
          :theme-name="theme?.name"
          :current-version="theme?.version"
        />

        <aside class="upload-guide" aria-label="主题发布指南">
          <section class="card upload-guide__section">
            <span class="upload-guide__number">01</span>
            <h2>准备 theme.json</h2>
            <p>配置唯一的主题 ID、名称、版本和浅色方案。发布者的 GitHub 身份由社区记录，无需填写账号密码。</p>
          </section>
          <section class="card upload-guide__section">
            <span class="upload-guide__number">02</span>
            <h2>打包可选资源</h2>
            <p>在 ZIP 根目录放置 theme.json，可添加 preview.png 预览图和 assets 目录中的背景图。</p>
            <ul>
              <li>PNG、JPEG 或 WebP 图片</li>
              <li>单张图片最大 4 MiB</li>
              <li>不能包含脚本或可执行文件</li>
            </ul>
          </section>
          <section class="card upload-guide__section">
            <span class="upload-guide__number">03</span>
            <h2>发布不可变版本</h2>
            <p>同一主题 ID 只能由原作者更新。每个版本号只能发布一次，已发布文件不能被覆盖。</p>
          </section>
          <a href="https://github.com/Iamliuxiaozhen/power-tv/tree/main/docs/theme-pack" target="_blank" rel="noreferrer" class="upload-docs">
            <Icon name="material-symbols:menu-book-outline" size="22" />
            <span><strong>主题包开发文档</strong><small>查看完整 Schema 与示例</small></span>
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
