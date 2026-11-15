<script setup lang="ts">
const { t } = useI18n()

type NavItem = {
  to: string
  label: string
  icon: string
  activeIcon: string
  exact?: boolean
}

const items = computed<NavItem[]>(() => [
  { to: '/', label: t('nav.home'), icon: 'material-symbols:home-outline', activeIcon: 'material-symbols:home', exact: true },
  { to: '/themes', label: t('nav.themes'), icon: 'material-symbols:palette-outline', activeIcon: 'material-symbols:palette' },
  { to: '/upload', label: t('nav.upload'), icon: 'material-symbols:add-circle-outline', activeIcon: 'material-symbols:add-circle' },
  { to: '/dashboard', label: t('nav.dashboard'), icon: 'material-symbols:account-circle-outline', activeIcon: 'material-symbols:account-circle' },
])
const route = useRoute()

function isActive(item: NavItem) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}
</script>

<template>
  <nav class="mobile-navigation" :aria-label="t('nav.main')">
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      :class="{ 'is-active': isActive(item) }"
      :aria-current="isActive(item) ? 'page' : undefined"
    >
      <span class="mobile-navigation__icon">
        <Icon :name="isActive(item) ? item.activeIcon : item.icon" size="24" />
      </span>
      <span>{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
