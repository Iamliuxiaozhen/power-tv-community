<script setup lang="ts">
const { t } = useI18n()
const { loggedIn, loginUrl, logout, ready, user } = useAuth()
const { colorModes, mode, selected } = useColorMode()
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <NuxtLink to="/" class="brand" :aria-label="t('header.brandHome')">
        <span class="brand__mark" aria-hidden="true">
          <Icon name="material-symbols:palette-outline" size="25" />
        </span>
        <span class="brand__text">
          <strong>power-tv</strong>
          <span>{{ t('header.brandSubtitle') }}</span>
        </span>
      </NuxtLink>

      <nav class="desktop-navigation" :aria-label="t('header.mainNavigation')">
        <NuxtLink to="/" exact-active-class="is-active">{{ t('nav.home') }}</NuxtLink>
        <NuxtLink to="/themes" active-class="is-active">{{ t('nav.browseThemes') }}</NuxtLink>
        <NuxtLink to="/guide" active-class="is-active">{{ t('nav.guide') }}</NuxtLink>
        <NuxtLink to="/upload" active-class="is-active">{{ t('nav.uploadTheme') }}</NuxtLink>
      </nav>

      <div class="app-header__actions">
        <AppLocaleSwitcher />

        <label class="color-mode-control">
          <Icon :name="selected.icon" size="20" aria-hidden="true" />
          <span class="visually-hidden">{{ t('header.colorMode') }}</span>
          <select v-model="mode" :aria-label="t('header.colorMode')">
            <option v-for="option in colorModes" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <Icon name="material-symbols:expand-more" size="18" aria-hidden="true" />
        </label>

        <div v-if="!ready" class="session-placeholder skeleton" :aria-label="t('header.sessionLoading')" />
        <template v-else-if="loggedIn && user">
          <NuxtLink to="/dashboard" class="user-link" :title="t('header.dashboard')">
            <img :src="user.avatarUrl" alt="" width="32" height="32">
            <span>{{ user.displayName || user.login }}</span>
          </NuxtLink>
          <button type="button" class="icon-button" :aria-label="t('header.logout')" :title="t('header.logout')" @click="logout">
            <Icon name="material-symbols:logout" size="21" />
          </button>
        </template>
        <a v-else :href="loginUrl()" class="button button--tonal button--small header-login">
          <Icon name="material-symbols:login" size="19" />
          <span>{{ t('header.login') }}</span>
        </a>
      </div>
    </div>
  </header>
</template>
