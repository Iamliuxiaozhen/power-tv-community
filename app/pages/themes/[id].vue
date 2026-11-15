<script setup lang="ts">
import type { ThemeDetailResponse, ThemeReactionResponse } from '#shared/community'

const { t } = useI18n()
const route = useRoute()
const { loggedIn, loginUrl, user } = useAuth()
const { showSnackbar } = useSnackbar()
const themeId = computed(() => String(route.params.id))
const requestFetch = useRequestFetch()
const { data, pending, error, refresh } = await useAsyncData(
  'theme-details',
  () => requestFetch<ThemeDetailResponse>(`/api/themes/${encodeURIComponent(themeId.value)}`),
  { watch: [themeId] },
)
const selectedVersion = computed(() => {
  if (!data.value) return undefined
  const requested = typeof route.query.version === 'string' ? route.query.version : undefined
  return data.value.versions.find(version => version.version === requested)
    ?? data.value.versions.find(version => version.version === data.value!.theme.version)
    ?? data.value.versions[0]
})
const downloadUrl = computed(() => {
  if (!data.value || !selectedVersion.value) return '#'
  const id = encodeURIComponent(data.value.theme.id)
  if (selectedVersion.value.version === data.value.theme.version) return `/api/themes/${id}/download`
  return `/api/themes/${id}/versions/${encodeURIComponent(selectedVersion.value.version)}/download`
})
const colorGroups = computed(() => {
  const schemes = selectedVersion.value?.metadata.schemes
  if (!schemes) return []
  const groups = [{ key: 'light', label: t('themeDetail.lightScheme'), colors: schemes.light }]
  if (schemes.dark) groups.push({ key: 'dark', label: t('themeDetail.darkScheme'), colors: schemes.dark })
  return groups.map(group => ({ ...group, entries: Object.entries(group.colors) }))
})

useHead({
  title: computed(() => data.value?.theme.name ?? t('themeDetail.metaTitle')),
  meta: computed(() => [{ name: 'description', content: data.value?.theme.description || t('themeDetail.metaDescription') }]),
})

const isOwner = computed(() => Boolean(data.value && user.value?.githubId === data.value.theme.owner.githubId))
const liked = ref(false)
const favorited = ref(false)
const likeCount = ref(0)
const reactionPending = ref<'like' | 'favorite' | null>(null)
watch(() => data.value, (value) => {
  liked.value = value?.viewer.liked ?? false
  favorited.value = value?.viewer.favorited ?? false
  likeCount.value = value?.theme.likes ?? 0
}, { immediate: true })

async function toggleReaction(reaction: 'like' | 'favorite'): Promise<void> {
  if (!loggedIn.value) {
    window.location.assign(loginUrl())
    return
  }
  if (reactionPending.value) return
  const active = reaction === 'like' ? !liked.value : !favorited.value
  reactionPending.value = reaction
  try {
    const result = await $fetch<ThemeReactionResponse>(`/api/themes/${encodeURIComponent(themeId.value)}/reactions`, {
      method: 'PUT',
      body: { reaction, active },
    })
    liked.value = result.liked
    favorited.value = result.favorited
    likeCount.value = result.likes
    showSnackbar(reaction === 'like'
      ? active ? t('themeDetail.likeAdded') : t('themeDetail.likeRemoved')
      : active ? t('themeDetail.favoriteAdded') : t('themeDetail.favoriteRemoved'))
  }
  catch {
    showSnackbar(t('themeDetail.reactionError'))
  }
  finally {
    reactionPending.value = null
  }
}

const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref('')

async function deleteTheme(): Promise<void> {
  if (deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/themes/${encodeURIComponent(themeId.value)}`, { method: 'DELETE' })
    deleteOpen.value = false
    showSnackbar(t('themeDetail.deleteSuccess'))
    await navigateTo('/themes')
  }
  catch {
    deleteError.value = t('themeDetail.deleteError')
  }
  finally {
    deleting.value = false
  }
}

function assetUrl(kind: 'preview' | 'backdrop'): string {
  return `/api/themes/${encodeURIComponent(themeId.value)}/versions/${encodeURIComponent(selectedVersion.value!.version)}/assets/${kind}`
}
</script>

<template>
  <div class="theme-detail-page">
    <div v-if="pending && !data" class="detail-loading" :aria-label="t('themeDetail.loading')">
      <div class="detail-loading__heading skeleton" />
      <div class="detail-loading__preview skeleton" />
      <div class="detail-loading__aside skeleton" />
    </div>
    <AppEmptyState
      v-else-if="error && !data"
      :icon="error.statusCode === 404 ? 'material-symbols:search-off' : 'material-symbols:cloud-off'"
      :title="error.statusCode === 404 ? t('themeDetail.notFoundTitle') : t('themeDetail.loadErrorTitle')"
      :description="error.statusCode === 404 ? t('themeDetail.notFoundDescription') : t('themeDetail.loadErrorDescription')"
    >
      <button v-if="error.statusCode !== 404" type="button" class="button button--tonal" @click="refresh()">{{ t('common.retry') }}</button>
      <NuxtLink to="/themes" class="button button--outlined">{{ t('themeDetail.backToCatalog') }}</NuxtLink>
    </AppEmptyState>

    <template v-else-if="data && selectedVersion">
      <nav class="detail-breadcrumb" :aria-label="t('themeDetail.breadcrumb')">
        <NuxtLink to="/themes"><Icon name="material-symbols:arrow-back" size="18" /> {{ t('themeDetail.backToCatalog') }}</NuxtLink>
        <span>/</span>
        <span>{{ data.theme.id }}</span>
      </nav>

      <header class="detail-header">
        <div class="detail-heading">
          <p class="eyebrow">{{ t('themeDetail.eyebrow') }}</p>
          <div class="detail-title">
            <h1>{{ data.theme.name }}</h1>
            <span class="badge">v{{ data.theme.version }}</span>
          </div>
          <p class="detail-id">{{ data.theme.id }}</p>
          <p class="detail-description">{{ data.theme.description || t('themeDetail.noDescription') }}</p>
          <div class="detail-byline">
            <NuxtLink :to="`/users/${encodeURIComponent(data.theme.owner.login)}`">
              <img :src="data.theme.owner.avatarUrl" alt="" width="32" height="32">
              <span>{{ t('themeDetail.publishedByPrefix') }} <strong>{{ data.theme.owner.displayName || data.theme.owner.login }}</strong> {{ t('themeDetail.publishedBySuffix') }}</span>
            </NuxtLink>
            <span><Icon name="material-symbols:download" size="18" /> {{ t('themeDetail.downloadCount', { count: data.theme.downloads }) }}</span>
            <span><Icon name="material-symbols:favorite-outline" size="18" /> {{ t('themeDetail.likeCount', { count: likeCount }) }}</span>
          </div>
        </div>
        <div class="detail-primary-action">
          <a :href="downloadUrl" class="button button--wide">
            <Icon name="material-symbols:download" size="21" />
            {{ selectedVersion.version === data.theme.version ? t('themeDetail.downloadLatest') : t('themeDetail.downloadVersion', { version: selectedVersion.version }) }}
          </a>
          <div class="detail-reactions" :aria-label="t('themeDetail.reactions')">
            <button
              type="button"
              class="button button--tonal"
              :class="{ 'is-active': liked }"
              :aria-pressed="liked"
              :disabled="reactionPending !== null"
              @click="toggleReaction('like')"
            >
              <Icon :name="liked ? 'material-symbols:favorite' : 'material-symbols:favorite-outline'" size="19" />
              {{ liked ? t('themeDetail.liked') : t('themeDetail.like') }} {{ likeCount }}
            </button>
            <button
              type="button"
              class="button button--tonal"
              :class="{ 'is-active': favorited }"
              :aria-pressed="favorited"
              :disabled="reactionPending !== null"
              @click="toggleReaction('favorite')"
            >
              <Icon :name="favorited ? 'material-symbols:bookmark' : 'material-symbols:bookmark-outline'" size="19" />
              {{ favorited ? t('themeDetail.favorited') : t('themeDetail.favorite') }}
            </button>
          </div>
          <div class="detail-report">
            <ModerationReportButton target-type="theme" :target-id="data.theme.id" />
          </div>
          <span>{{ t('themeDetail.minAppVersion', { version: selectedVersion.metadata.minAppVersion ?? '1.5.0' }) }}</span>
        </div>
      </header>

      <section v-if="isOwner" class="owner-actions" :aria-label="t('themeDetail.ownerActions')">
        <div>
          <Icon name="material-symbols:admin-panel-settings-outline" size="23" />
          <span><strong>{{ t('themeDetail.ownerActions') }}</strong><small>{{ t('themeDetail.ownerDescription') }}</small></span>
        </div>
        <div class="owner-actions__buttons">
          <NuxtLink :to="`/upload/${encodeURIComponent(data.theme.id)}`" class="button button--tonal button--small">
            <Icon name="material-symbols:upload" size="19" /> {{ t('themeDetail.uploadVersion') }}
          </NuxtLink>
          <button type="button" class="button button--outlined button--small owner-delete" @click="deleteOpen = true; deleteError = ''">
            <Icon name="material-symbols:delete-outline" size="19" /> {{ t('themeDetail.deleteTheme') }}
          </button>
        </div>
      </section>

      <div v-if="selectedVersion.version !== data.theme.version" class="history-notice" role="status">
        <Icon name="material-symbols:history" size="22" />
        <div>{{ t('themeDetail.historyNoticePrefix') }} <strong>v{{ selectedVersion.version }}</strong>{{ t('themeDetail.historyNoticeSuffix') }}<NuxtLink :to="{ query: {} }">{{ t('themeDetail.backToLatest', { version: data.theme.version }) }}</NuxtLink></div>
      </div>

      <div class="detail-layout">
        <div class="detail-main">
          <ThemePreview :key="selectedVersion.version" :theme-id="data.theme.id" :version="selectedVersion" />

          <section v-if="selectedVersion.hasPreview" class="package-preview">
            <div class="section-heading">
              <div><h2>{{ t('themeDetail.packagePreviewTitle') }}</h2><p>{{ t('themeDetail.packagePreviewDescription') }}</p></div>
            </div>
            <img :src="assetUrl('preview')" :alt="t('themeDetail.packagePreviewAlt', { name: data.theme.name, version: selectedVersion.version })" loading="lazy">
          </section>

          <section class="color-section" aria-labelledby="colors-heading">
            <div class="section-heading">
              <div><h2 id="colors-heading">{{ t('themeDetail.colorsTitle') }}</h2><p>{{ t('themeDetail.colorsDescription') }}</p></div>
            </div>
            <div class="color-groups">
              <article v-for="group in colorGroups" :key="group.key" class="color-group card">
                <h3><Icon :name="group.key === 'dark' ? 'material-symbols:dark-mode-outline' : 'material-symbols:light-mode-outline'" size="20" /> {{ group.label }}</h3>
                <div class="color-grid">
                  <div v-for="([role, color]) in group.entries" :key="role" class="color-token">
                    <span class="color-swatch" :style="{ backgroundColor: color }" aria-hidden="true" />
                    <div><strong>{{ role }}</strong><code>{{ color }}</code></div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <aside class="detail-sidebar" :aria-label="t('themeDetail.releaseInfo')">
          <section class="release-card card">
            <div class="release-card__heading">
              <span><Icon name="material-symbols:deployed-code-outline" size="24" /></span>
              <div><p>{{ t('themeDetail.currentVersion') }}</p><h2>v{{ selectedVersion.version }}</h2></div>
            </div>
            <dl class="release-facts">
              <div><dt>{{ t('themeDetail.fileName') }}</dt><dd>{{ selectedVersion.fileName }}</dd></div>
              <div><dt>{{ t('themeDetail.fileSize') }}</dt><dd>{{ formatByteSize(selectedVersion.byteSize) }}</dd></div>
              <div><dt>{{ t('themeDetail.minAppVersionLabel') }}</dt><dd>{{ selectedVersion.metadata.minAppVersion ?? '1.5.0' }}</dd></div>
              <div><dt>Schema</dt><dd>v{{ selectedVersion.metadata.schemaVersion }}</dd></div>
              <div><dt>{{ t('themeDetail.publishedAt') }}</dt><dd>{{ formatDate(selectedVersion.createdAt) }}</dd></div>
            </dl>
            <div class="release-hash">
              <span><Icon name="material-symbols:verified-user-outline" size="17" /> SHA-256</span>
              <code>{{ selectedVersion.sha256 }}</code>
            </div>
            <p class="release-immutable"><Icon name="material-symbols:lock-outline" size="17" /> {{ t('themeDetail.immutable') }}</p>
          </section>
          <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-packs.md" target="_blank" rel="noreferrer" class="install-guide">
            <Icon name="material-symbols:menu-book-outline" size="22" />
            <span><strong>{{ t('themeDetail.installTitle') }}</strong><small>{{ t('themeDetail.installDescription') }}</small></span>
            <Icon name="material-symbols:open-in-new" size="18" />
          </a>
        </aside>
      </div>

      <ThemeVersionList
        :theme-id="data.theme.id"
        :versions="data.versions"
        :latest-version="data.theme.version"
        :selected-version="selectedVersion.version"
      />

      <ThemeComments :key="data.theme.id" :theme-id="data.theme.id" />

      <AppDialog
        v-model:open="deleteOpen"
        :title="t('themeDetail.deleteDialogTitle')"
        :description="t('themeDetail.deleteDialogDescription', { name: data.theme.name, id: data.theme.id })"
      >
        <p class="delete-confirmation">{{ t('themeDetail.deleteDialogBody') }}</p>
        <p v-if="deleteError" class="delete-error" role="alert">{{ deleteError }}</p>
        <template #actions>
          <button type="button" class="button button--text" :disabled="deleting" @click="deleteOpen = false">{{ t('common.cancel') }}</button>
          <button type="button" class="button button--danger" :disabled="deleting" @click="deleteTheme">
            <Icon name="material-symbols:delete-outline" size="19" /> {{ deleting ? t('themeDetail.deleting') : t('themeDetail.confirmDelete') }}
          </button>
        </template>
      </AppDialog>
    </template>
  </div>
</template>

<style scoped>
.detail-breadcrumb {
  display: flex;
  margin-bottom: 24px;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  gap: 10px;
}

.detail-breadcrumb a {
  display: inline-flex;
  align-items: center;
  color: var(--md-on-surface-variant);
  gap: 6px;
  text-decoration: none;
}

.detail-breadcrumb a:hover {
  color: var(--md-primary);
}

.detail-breadcrumb > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-header {
  display: flex;
  margin-bottom: 36px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
}

.detail-heading {
  min-width: 0;
}

.detail-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.detail-title h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 52px);
  letter-spacing: -0.04em;
  line-height: 1.12;
  overflow-wrap: anywhere;
}

.detail-id {
  margin: 8px 0 0;
  color: var(--md-on-surface-variant);
  font-family: monospace;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.detail-description {
  max-width: 720px;
  margin: 20px 0;
  color: var(--md-on-surface-variant);
  font-size: 16px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.detail-byline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  gap: 18px;
}

.detail-byline > a,
.detail-byline > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.detail-byline > a {
  color: inherit;
  text-decoration: none;
}

.detail-byline > a:hover strong {
  color: var(--md-primary);
  text-decoration: underline;
}

.detail-byline img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.detail-primary-action {
  width: 250px;
  flex: 0 0 auto;
}

.detail-reactions {
  display: grid;
  margin-top: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.detail-reactions .button {
  min-height: 40px;
  padding: 8px 10px;
  font-size: 12px;
}

.detail-reactions .button.is-active {
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.detail-report {
  display: flex;
  justify-content: center;
}

.detail-report :deep(.report-button) {
  width: 100%;
  margin-top: 4px;
}

.detail-primary-action > span {
  display: block;
  margin-top: 10px;
  color: var(--md-on-surface-variant);
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

.owner-actions {
  display: flex;
  margin: -12px 0 28px;
  padding: 16px 18px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  align-items: center;
  justify-content: space-between;
  background: var(--md-surface-container-low);
  gap: 20px;
}

.owner-actions > div:first-child,
.owner-actions > div:first-child > span {
  display: flex;
  align-items: center;
  gap: 10px;
}

.owner-actions > div:first-child > .icon {
  color: var(--md-primary);
  flex: 0 0 auto;
}

.owner-actions > div:first-child > span {
  align-items: flex-start;
  flex-direction: column;
  gap: 1px;
}

.owner-actions strong {
  font-size: 14px;
}

.owner-actions small {
  color: var(--md-on-surface-variant);
  font-size: 12px;
}

.owner-actions__buttons {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.owner-delete {
  color: var(--md-error);
}

.delete-confirmation {
  margin-bottom: 0;
  color: var(--md-on-surface-variant);
  font-size: 14px;
  line-height: 1.7;
}

.delete-error {
  margin: 14px 0 0;
  color: var(--md-error);
  font-size: 13px;
}

.history-notice {
  display: flex;
  margin: -12px 0 28px;
  padding: 14px 18px;
  border-radius: var(--md-radius-medium);
  align-items: center;
  background: var(--md-tertiary-container);
  color: var(--md-on-tertiary-container);
  font-size: 14px;
  gap: 12px;
}

.history-notice a {
  margin-left: 6px;
  color: inherit;
}

.detail-layout {
  display: grid;
  align-items: start;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 28px;
}

.detail-main {
  min-width: 0;
}

.detail-sidebar {
  position: sticky;
  top: calc(var(--md-header-height) + 24px);
  display: grid;
  min-width: 0;
  gap: 16px;
}

.release-card {
  padding: 22px;
  background: var(--md-surface-container-low);
}

.release-card__heading {
  display: flex;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--md-outline-variant);
  align-items: center;
  gap: 12px;
}

.release-card__heading > span {
  display: inline-flex;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  align-items: center;
  justify-content: center;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.release-card__heading p,
.release-card__heading h2 {
  margin: 0;
}

.release-card__heading p {
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.release-card__heading h2 {
  font-size: 22px;
}

.release-facts {
  display: grid;
  margin: 8px 0 20px;
}

.release-facts > div {
  display: flex;
  padding: 10px 0;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
}

.release-facts dt {
  color: var(--md-on-surface-variant);
  flex: 0 0 auto;
}

.release-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
}

.release-hash {
  padding: 14px;
  border-radius: var(--md-radius-medium);
  background: var(--md-surface-container-lowest);
}

.release-hash > span {
  display: flex;
  margin-bottom: 8px;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 11px;
  font-weight: 600;
  gap: 6px;
}

.release-hash code {
  display: block;
  color: var(--md-on-surface);
  font-size: 10px;
  line-height: 1.6;
  overflow-wrap: anywhere;
  user-select: all;
}

.release-immutable {
  display: flex;
  margin: 16px 0 0;
  align-items: flex-start;
  color: var(--md-on-surface-variant);
  font-size: 11px;
  gap: 6px;
}

.release-immutable .icon {
  flex: 0 0 auto;
}

.install-guide {
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

.install-guide:hover {
  background: var(--md-surface-container-low);
}

.install-guide > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.install-guide strong {
  font-size: 13px;
}

.install-guide small {
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.color-section,
.package-preview {
  margin-top: 44px;
}

.color-section .section-heading h2,
.package-preview .section-heading h2 {
  font-size: 25px;
}

.color-groups {
  display: grid;
  gap: 18px;
}

.color-group h3 {
  display: flex;
  margin-bottom: 18px;
  align-items: center;
  font-size: 16px;
  gap: 8px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}

.color-token {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.color-swatch {
  width: 36px;
  height: 36px;
  border: 1px solid var(--md-outline-variant);
  border-radius: 11px;
  flex: 0 0 auto;
}

.color-token > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.color-token strong {
  overflow: hidden;
  font-size: 12px;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.color-token code {
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.package-preview img {
  width: 100%;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  background: var(--md-surface-container-low);
}

.detail-loading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
}

.detail-loading__heading {
  height: 160px;
  margin-bottom: 20px;
  border-radius: 24px;
  grid-column: 1 / -1;
}

.detail-loading__preview {
  aspect-ratio: 16 / 10;
  border-radius: 28px;
}

.detail-loading__aside {
  height: 420px;
  border-radius: 20px;
}

@media (max-width: 960px) {
  .detail-layout,
  .detail-loading {
    grid-template-columns: minmax(0, 1fr) 270px;
    gap: 20px;
  }

  .detail-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .detail-primary-action {
    width: min(100%, 340px);
  }
}

@media (max-width: 760px) {
  .owner-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .owner-actions__buttons {
    width: 100%;
    flex-wrap: wrap;
  }

  .detail-layout,
  .detail-loading {
    grid-template-columns: 1fr;
  }

  .detail-sidebar {
    position: static;
    grid-template-columns: 1fr;
  }

  .release-facts > div {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .detail-header {
    margin-bottom: 28px;
    gap: 24px;
  }

  .detail-title h1 {
    font-size: 34px;
  }

  .detail-byline {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .detail-primary-action {
    width: 100%;
  }

  .history-notice {
    align-items: flex-start;
  }

  .history-notice a {
    display: block;
    margin: 4px 0 0;
  }

  .color-grid {
    grid-template-columns: 1fr;
  }
}
</style>
