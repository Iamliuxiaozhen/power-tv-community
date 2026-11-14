<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { ThemeSummary } from '#shared/community'

const props = defineProps<{ theme: ThemeSummary }>()
const previewStyle = computed(() => ({
  '--preview-primary': props.theme.colors.light.primary,
  '--preview-surface': props.theme.colors.light.surface,
}) as CSSProperties)
</script>

<template>
  <article class="theme-card card card--interactive">
    <NuxtLink :to="`/themes/${encodeURIComponent(theme.id)}`" class="theme-card__preview-link" tabindex="-1" aria-hidden="true">
      <div class="theme-preview" :style="previewStyle">
        <div class="theme-preview__topbar">
          <span class="theme-preview__logo" />
          <span class="theme-preview__nav" />
          <span class="theme-preview__avatar" />
        </div>
        <div class="theme-preview__content">
          <div class="theme-preview__hero">
            <span class="theme-preview__eyebrow" />
            <span class="theme-preview__title" />
            <span class="theme-preview__line" />
            <span class="theme-preview__button" />
          </div>
          <div class="theme-preview__stats">
            <span v-for="index in 3" :key="index"><i /><b /></span>
          </div>
        </div>
        <span class="theme-preview__version">{{ theme.version }}</span>
      </div>
    </NuxtLink>

    <div class="theme-card__body">
      <div class="theme-card__title-row">
        <div>
          <h2>
            <NuxtLink :to="`/themes/${encodeURIComponent(theme.id)}`">{{ theme.name }}</NuxtLink>
          </h2>
          <span class="theme-card__id">{{ theme.id }}</span>
        </div>
        <span class="badge">v{{ theme.version }}</span>
      </div>
      <p class="theme-card__description">{{ theme.description || '这个主题还没有添加描述。' }}</p>
      <div class="theme-card__footer">
        <NuxtLink :to="`/users/${encodeURIComponent(theme.owner.login)}`" class="theme-card__author">
          <img :src="theme.owner.avatarUrl" alt="" width="28" height="28" loading="lazy">
          <span>{{ theme.owner.displayName || theme.owner.login }}</span>
        </NuxtLink>
        <div class="theme-card__metrics" aria-label="主题统计">
          <span title="下载量"><Icon name="material-symbols:download" size="17" />{{ theme.downloads }}</span>
          <span title="点赞数"><Icon name="material-symbols:favorite-outline" size="17" />{{ theme.likes }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.theme-card {
  display: flex;
  padding: 0;
  overflow: hidden;
  flex-direction: column;
}

.theme-card__preview-link {
  display: block;
  color: inherit;
}

.theme-preview {
  position: relative;
  aspect-ratio: 16 / 9;
  padding: 12px;
  overflow: hidden;
  background: var(--preview-surface);
  color: #171c1b;
}

.theme-preview__topbar {
  display: flex;
  height: 12%;
  align-items: center;
  gap: 5%;
}

.theme-preview__logo {
  width: 9%;
  aspect-ratio: 1;
  border-radius: 35%;
  background: var(--preview-primary);
}

.theme-preview__nav {
  width: 30%;
  height: 5px;
  border-radius: 5px;
  background: color-mix(in srgb, currentColor 15%, transparent);
}

.theme-preview__avatar {
  width: 5%;
  aspect-ratio: 1;
  margin-left: auto;
  border-radius: 50%;
  background: var(--preview-primary);
  opacity: 0.65;
}

.theme-preview__content {
  display: grid;
  height: 80%;
  padding-top: 4%;
  grid-template-columns: 1.35fr 1fr;
  gap: 5%;
}

.theme-preview__hero {
  display: flex;
  padding: 9%;
  border-radius: 10px;
  background: color-mix(in srgb, var(--preview-primary) 13%, transparent);
  flex-direction: column;
}

.theme-preview__eyebrow {
  width: 28%;
  height: 4px;
  border-radius: 4px;
  background: var(--preview-primary);
}

.theme-preview__title {
  width: 74%;
  height: 8px;
  margin-top: 10%;
  border-radius: 6px;
  background: color-mix(in srgb, currentColor 72%, transparent);
}

.theme-preview__line {
  width: 88%;
  height: 4px;
  margin-top: 7%;
  border-radius: 4px;
  background: color-mix(in srgb, currentColor 20%, transparent);
}

.theme-preview__button {
  width: 34%;
  height: 12%;
  min-height: 8px;
  margin-top: auto;
  border-radius: 999px;
  background: var(--preview-primary);
}

.theme-preview__stats {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  gap: 8%;
}

.theme-preview__stats > span {
  display: flex;
  padding: 8%;
  border-radius: 8px;
  align-items: center;
  gap: 10%;
  background: color-mix(in srgb, currentColor 6%, transparent);
}

.theme-preview__stats i {
  width: 18%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--preview-primary);
  opacity: 0.8;
}

.theme-preview__stats b {
  width: 48%;
  height: 4px;
  border-radius: 4px;
  background: color-mix(in srgb, currentColor 22%, transparent);
}

.theme-preview__version {
  position: absolute;
  right: 10px;
  bottom: 8px;
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--preview-surface) 80%, transparent);
  font-size: 9px;
  font-weight: 650;
}

.theme-card__body {
  display: flex;
  padding: 20px;
  flex: 1;
  flex-direction: column;
}

.theme-card__title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.theme-card__title-row > div {
  min-width: 0;
}

.theme-card h2 {
  margin-bottom: 3px;
  font-size: 19px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.theme-card h2 a {
  color: var(--md-on-surface);
  text-decoration: none;
}

.theme-card h2 a:hover {
  color: var(--md-primary);
}

.theme-card__id {
  display: block;
  overflow: hidden;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-card__description {
  display: -webkit-box;
  min-height: 44px;
  margin: 16px 0 20px;
  overflow: hidden;
  color: var(--md-on-surface-variant);
  font-size: 14px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.theme-card__footer {
  display: flex;
  min-width: 0;
  margin-top: auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.theme-card__author {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  text-decoration: none;
}

.theme-card__author img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.theme-card__author span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-card__metrics {
  display: flex;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  gap: 10px;
}

.theme-card__metrics span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
</style>
