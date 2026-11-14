<script setup lang="ts">
import type { ThemeVersionSummary } from '#shared/community'

const props = defineProps<{
  themeId: string
  versions: ThemeVersionSummary[]
  latestVersion: string
  selectedVersion?: string
}>()

function downloadUrl(version: string): string {
  return `/api/themes/${encodeURIComponent(props.themeId)}/versions/${encodeURIComponent(version)}/download`
}

function detailTarget(version: string) {
  return {
    query: version === props.latestVersion ? {} : { version },
    hash: '#versions',
  }
}
</script>

<template>
  <section id="versions" class="version-section" aria-labelledby="version-heading">
    <div class="section-heading">
      <div>
        <p class="eyebrow">IMMUTABLE RELEASES</p>
        <h2 id="version-heading">历史版本</h2>
        <p>每个发布版本都会永久保留，不会被后续上传覆盖。</p>
      </div>
      <span class="chip"><Icon name="material-symbols:history" size="18" /> {{ versions.length }} 个版本</span>
    </div>

    <div class="version-list">
      <article v-for="version in versions" :key="version.version" class="version-row" :class="{ 'version-row--selected': selectedVersion === version.version }">
        <span class="version-row__icon"><Icon name="material-symbols:deployed-code-outline" size="23" /></span>
        <div class="version-row__identity">
          <div>
            <NuxtLink :to="detailTarget(version.version)" :aria-current="selectedVersion === version.version ? 'true' : undefined">
              v{{ version.version }}
            </NuxtLink>
            <span v-if="version.version === latestVersion" class="badge">最新版</span>
          </div>
          <p>{{ formatDate(version.createdAt) }} · 需要 power-tv {{ version.metadata.minAppVersion ?? '1.5.0' }}+</p>
        </div>
        <span class="version-row__size">{{ formatByteSize(version.byteSize) }}</span>
        <a :href="downloadUrl(version.version)" class="button button--tonal button--small" :aria-label="`下载版本 ${version.version}`">
          <Icon name="material-symbols:download" size="18" /> <span>下载</span>
        </a>
      </article>
    </div>
  </section>
</template>

<style scoped>
.version-section {
  margin-top: 56px;
  scroll-margin-top: calc(var(--md-header-height) + 20px);
}

.version-list {
  overflow: hidden;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  background: var(--md-surface-container-lowest);
}

.version-row {
  display: grid;
  min-width: 0;
  padding: 18px 20px;
  align-items: center;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 16px;
}

.version-row + .version-row {
  border-top: 1px solid var(--md-outline-variant);
}

.version-row--selected {
  background: color-mix(in srgb, var(--md-primary-container) 25%, transparent);
  box-shadow: inset 3px 0 var(--md-primary);
}

.version-row__icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  background: var(--md-surface-container-high);
  color: var(--md-primary);
}

.version-row__identity {
  min-width: 0;
}

.version-row__identity > div {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}

.version-row__identity a {
  color: var(--md-on-surface);
  font-size: 17px;
  font-weight: 650;
  text-decoration: none;
}

.version-row__identity a:hover {
  color: var(--md-primary);
  text-decoration: underline;
}

.version-row__identity p {
  margin: 3px 0 0;
  color: var(--md-on-surface-variant);
  font-size: 12px;
}

.version-row__size {
  color: var(--md-on-surface-variant);
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .version-row {
    padding: 16px;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 12px;
  }

  .version-row__icon {
    width: 38px;
    height: 38px;
  }

  .version-row__size {
    display: none;
  }

  .version-row .button {
    width: 40px;
    padding: 0;
  }

  .version-row .button span {
    display: none;
  }
}
</style>
