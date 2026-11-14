<script setup lang="ts">
const { loggedIn, loginUrl, logout, ready, user } = useAuth()
const { colorModes, mode, selected } = useColorMode()
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <NuxtLink to="/" class="brand" aria-label="power-tv 主题社区首页">
        <span class="brand__mark" aria-hidden="true">
          <Icon name="material-symbols:palette-outline" size="25" />
        </span>
        <span class="brand__text">
          <strong>power-tv</strong>
          <span>主题社区</span>
        </span>
      </NuxtLink>

      <nav class="desktop-navigation" aria-label="主要导航">
        <NuxtLink to="/" exact-active-class="is-active">首页</NuxtLink>
        <NuxtLink to="/themes" active-class="is-active">浏览主题</NuxtLink>
        <NuxtLink to="/upload" active-class="is-active">发布主题</NuxtLink>
      </nav>

      <div class="app-header__actions">
        <label class="color-mode-control">
          <Icon :name="selected.icon" size="20" aria-hidden="true" />
          <span class="visually-hidden">界面主题</span>
          <select v-model="mode" aria-label="界面主题">
            <option v-for="option in colorModes" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <Icon name="material-symbols:expand-more" size="18" aria-hidden="true" />
        </label>

        <div v-if="!ready" class="session-placeholder skeleton" aria-label="正在读取登录状态" />
        <template v-else-if="loggedIn && user">
          <NuxtLink to="/dashboard" class="user-link" title="个人面板">
            <img :src="user.avatarUrl" alt="" width="32" height="32">
            <span>{{ user.displayName || user.login }}</span>
          </NuxtLink>
          <button type="button" class="icon-button" aria-label="退出登录" title="退出登录" @click="logout">
            <Icon name="material-symbols:logout" size="21" />
          </button>
        </template>
        <a v-else :href="loginUrl()" class="button button--tonal button--small header-login">
          <Icon name="material-symbols:login" size="19" />
          <span>GitHub 登录</span>
        </a>
      </div>
    </div>
  </header>
</template>
