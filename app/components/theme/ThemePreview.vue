<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { ThemeVersionSummary } from '#shared/community'
import type { ThemeModule } from '#shared/theme/types'

const props = defineProps<{
  themeId: string
  version: ThemeVersionSummary
}>()

const { t } = useI18n()
const mode = ref<'light' | 'dark'>('light')
const manifest = computed(() => props.version.metadata)
const colors = computed(() => mode.value === 'dark'
  ? manifest.value.schemes.dark ?? manifest.value.schemes.light
  : manifest.value.schemes.light)
const moduleInfo = computed<Partial<Record<ThemeModule, { label: string, value: string, icon: string }>>>(() => ({
  cpu: { label: t('preview.modules.cpu'), value: '32%', icon: 'material-symbols:memory' },
  gpu: { label: t('preview.modules.gpu'), value: '18%', icon: 'material-symbols:monitor-outline' },
  thermal: { label: t('preview.modules.thermal'), value: '42°C', icon: 'material-symbols:device-thermostat' },
  memory: { label: t('preview.modules.memory'), value: '2.4 GB', icon: 'material-symbols:developer-board' },
  battery: { label: t('preview.modules.battery'), value: '86%', icon: 'material-symbols:battery-5-bar' },
  device: { label: t('preview.modules.device'), value: t('preview.modules.connected'), icon: 'material-symbols:tv' },
}))
const visibleModules = computed(() => {
  const configured = manifest.value.layout?.visible ?? manifest.value.layout?.order ?? ['cpu', 'memory', 'battery']
  const modules = configured.filter(module => module !== 'hero' && moduleInfo.value[module])
  return (modules.length > 0 ? modules : ['cpu', 'memory', 'battery'] as ThemeModule[]).slice(0, 3)
})
const showHero = computed(() => {
  const visible = manifest.value.layout?.visible
  return !visible || visible.includes('hero')
})
const previewStyle = computed(() => {
  const scheme = colors.value
  const isDark = mode.value === 'dark'
  const backdropUrl = `/api/themes/${encodeURIComponent(props.themeId)}/versions/${encodeURIComponent(props.version.version)}/assets/backdrop`
  const dim = manifest.value.backdrop?.dim ?? 0
  return {
    '--demo-primary': scheme.primary ?? manifest.value.seed ?? (isDark ? '#d0bcff' : '#6750a4'),
    '--demo-on-primary': scheme.onPrimary ?? (isDark ? '#381e72' : '#ffffff'),
    '--demo-primary-container': scheme.primaryContainer ?? scheme.primary ?? manifest.value.seed ?? (isDark ? '#4f378b' : '#eaddff'),
    '--demo-on-primary-container': scheme.onPrimaryContainer ?? scheme.onSurface ?? (isDark ? '#eaddff' : '#21005d'),
    '--demo-surface': scheme.surface ?? scheme.background ?? (isDark ? '#141218' : '#fef7ff'),
    '--demo-on-surface': scheme.onSurface ?? scheme.onBackground ?? (isDark ? '#e6e0e9' : '#1d1b20'),
    '--demo-muted': scheme.onSurfaceVariant ?? (isDark ? '#cac4d0' : '#49454f'),
    '--demo-card': scheme.surfaceContainerLow ?? scheme.surfaceVariant ?? (isDark ? '#1d1b20' : '#f3edf7'),
    '--demo-outline': scheme.outlineVariant ?? scheme.outline ?? (isDark ? '#49454f' : '#cac4d0'),
    '--demo-radius': `${manifest.value.shape?.cardRadiusDp ?? 16}px`,
    '--demo-backdrop': props.version.hasBackdrop
      ? `linear-gradient(rgb(0 0 0 / ${dim}), rgb(0 0 0 / ${dim})), url("${backdropUrl}")`
      : 'none',
  } as CSSProperties
})
</script>

<template>
  <section class="preview-shell" :aria-label="t('preview.ariaLabel')">
    <div class="preview-toolbar">
      <span><i aria-hidden="true" /> {{ t('preview.liveColors') }}</span>
      <div class="preview-modes" role="group" :aria-label="t('preview.modesAria')">
        <button type="button" :class="{ 'is-active': mode === 'light' }" :aria-pressed="mode === 'light'" @click="mode = 'light'">
          <Icon name="material-symbols:light-mode-outline" size="18" /> {{ t('preview.light') }}
        </button>
        <button v-if="manifest.schemes.dark" type="button" :class="{ 'is-active': mode === 'dark' }" :aria-pressed="mode === 'dark'" @click="mode = 'dark'">
          <Icon name="material-symbols:dark-mode-outline" size="18" /> {{ t('preview.dark') }}
        </button>
      </div>
    </div>

    <div class="theme-demo" :style="previewStyle" aria-hidden="true">
      <div class="theme-demo__surface">
        <header class="demo-topbar">
          <div class="demo-brand"><span><Icon name="material-symbols:tv" size="18" /></span><b>power-tv</b></div>
          <div class="demo-navigation"><i /><i /><i /></div>
          <div class="demo-avatar" />
        </header>
        <div class="demo-content" :class="{ 'demo-content--without-hero': !showHero }">
          <article v-if="showHero" class="demo-hero">
            <span class="demo-eyebrow">{{ t('preview.eyebrow') }}</span>
            <strong>{{ t('preview.heroTitle') }}</strong>
            <p>{{ t('preview.heroDescription') }}</p>
            <span class="demo-action">{{ t('preview.heroAction') }} <Icon name="material-symbols:arrow-forward" size="13" /></span>
          </article>
          <div class="demo-stats">
            <article v-for="module in visibleModules" :key="module">
              <span class="demo-stat-icon"><Icon :name="moduleInfo[module]!.icon" size="17" /></span>
              <span>{{ moduleInfo[module]!.label }}</span>
              <strong>{{ moduleInfo[module]!.value }}</strong>
              <i><b /></i>
            </article>
          </div>
        </div>
      </div>
    </div>
    <p class="preview-caption"><Icon name="material-symbols:info-outline" size="16" /> {{ t('preview.caption') }}</p>
  </section>
</template>

<style scoped>
.preview-shell {
  min-width: 0;
}

.preview-toolbar {
  display: flex;
  margin-bottom: 14px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.preview-toolbar > span {
  display: inline-flex;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  font-weight: 550;
  gap: 8px;
}

.preview-toolbar > span i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--md-primary);
  box-shadow: 0 0 0 4px var(--md-primary-container);
}

.preview-modes {
  display: flex;
  padding: 3px;
  border: 1px solid var(--md-outline-variant);
  border-radius: 999px;
  gap: 2px;
}

.preview-modes button {
  display: inline-flex;
  min-height: 34px;
  padding: 5px 12px;
  border: 0;
  border-radius: 999px;
  align-items: center;
  background: transparent;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  gap: 5px;
}

.preview-modes button.is-active {
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.theme-demo {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 10;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-extra-large);
  background-color: var(--demo-surface);
  background-image: var(--demo-backdrop);
  background-position: center;
  background-size: cover;
  box-shadow: 0 4px 20px var(--md-shadow);
  color: var(--demo-on-surface);
}

.theme-demo__surface {
  height: 100%;
  padding: clamp(14px, 3vw, 28px);
  background: color-mix(in srgb, var(--demo-surface) 82%, transparent);
}

.demo-topbar {
  display: flex;
  height: 14%;
  align-items: center;
  gap: 8%;
}

.demo-brand {
  display: flex;
  align-items: center;
  font-size: clamp(10px, 1.6vw, 16px);
  gap: 8px;
}

.demo-brand > span {
  display: inline-flex;
  width: clamp(25px, 4vw, 38px);
  aspect-ratio: 1;
  border-radius: 30%;
  align-items: center;
  justify-content: center;
  background: var(--demo-primary);
  color: var(--demo-on-primary);
}

.demo-navigation {
  display: flex;
  margin-left: auto;
  gap: 10px;
}

.demo-navigation i {
  width: clamp(20px, 4vw, 44px);
  height: 5px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--demo-muted) 30%, transparent);
}

.demo-navigation i:first-child {
  background: var(--demo-primary);
}

.demo-avatar {
  width: clamp(20px, 3vw, 30px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--demo-primary-container);
}

.demo-content {
  display: grid;
  height: 79%;
  padding-top: 2%;
  grid-template-columns: 1.25fr 1fr;
  gap: 3%;
}

.demo-hero {
  display: flex;
  min-width: 0;
  padding: 7%;
  border-radius: var(--demo-radius);
  background: var(--demo-primary-container);
  color: var(--demo-on-primary-container);
  flex-direction: column;
}

.demo-eyebrow {
  font-size: clamp(6px, 0.85vw, 9px);
  font-weight: 700;
  letter-spacing: 0.1em;
  opacity: 0.75;
}

.demo-hero > strong {
  margin-top: 8%;
  font-size: clamp(15px, 3vw, 30px);
  line-height: 1.2;
}

.demo-hero p {
  margin: 3% 0 0;
  font-size: clamp(8px, 1.2vw, 12px);
  opacity: 0.75;
}

.demo-action {
  display: inline-flex;
  margin-top: auto;
  padding: 5px 12px;
  border-radius: 999px;
  align-items: center;
  align-self: flex-start;
  background: var(--demo-primary);
  color: var(--demo-on-primary);
  font-size: clamp(7px, 1vw, 10px);
  gap: 5px;
}

.demo-stats {
  display: grid;
  min-width: 0;
  grid-template-rows: repeat(3, 1fr);
  gap: 5%;
}

.demo-stats article {
  display: grid;
  min-width: 0;
  padding: 5% 7%;
  border: 1px solid color-mix(in srgb, var(--demo-outline) 45%, transparent);
  border-radius: var(--demo-radius);
  align-items: center;
  background: color-mix(in srgb, var(--demo-card) 92%, transparent);
  grid-template-columns: auto 1fr auto;
  gap: 4%;
}

.demo-stat-icon {
  display: inline-flex;
  width: clamp(22px, 3vw, 30px);
  aspect-ratio: 1;
  border-radius: 35%;
  align-items: center;
  justify-content: center;
  background: var(--demo-primary-container);
  color: var(--demo-on-primary-container);
  grid-row: span 2;
}

.demo-stats article > span:nth-child(2) {
  overflow: hidden;
  color: var(--demo-muted);
  font-size: clamp(7px, 1.1vw, 11px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-stats article > strong {
  font-size: clamp(9px, 1.5vw, 15px);
  grid-column: 3;
  grid-row: 1 / span 2;
}

.demo-stats article > i {
  height: 3px;
  overflow: hidden;
  border-radius: 3px;
  background: color-mix(in srgb, var(--demo-outline) 45%, transparent);
}

.demo-stats article > i b {
  display: block;
  width: 56%;
  height: 100%;
  border-radius: inherit;
  background: var(--demo-primary);
}

.demo-content--without-hero {
  grid-template-columns: 1fr;
}

.demo-content--without-hero .demo-stats {
  grid-template-rows: 1fr;
  grid-template-columns: repeat(3, 1fr);
}

.demo-content--without-hero .demo-stats article {
  align-content: center;
  grid-template-columns: 1fr;
  justify-items: center;
  text-align: center;
}

.demo-content--without-hero .demo-stat-icon,
.demo-content--without-hero .demo-stats article > strong {
  grid-column: auto;
  grid-row: auto;
}

.demo-content--without-hero .demo-stats article > i {
  width: 100%;
}

.preview-caption {
  display: flex;
  margin: 12px 0 0;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  gap: 6px;
}

@media (max-width: 480px) {
  .preview-toolbar > span {
    display: none;
  }

  .preview-modes {
    margin-left: auto;
  }

  .theme-demo {
    aspect-ratio: 4 / 3;
    border-radius: 20px;
  }

  .demo-content {
    grid-template-columns: 1.15fr 1fr;
  }

  .demo-stats article {
    padding: 4%;
    gap: 3%;
  }

  .demo-stat-icon {
    display: none;
  }

  .demo-stats article > span:nth-child(2),
  .demo-stats article > strong,
  .demo-stats article > i {
    grid-column: 1 / -1;
    grid-row: auto;
  }
}
</style>
