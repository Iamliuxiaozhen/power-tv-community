<script setup lang="ts">
const items = [
  { to: '/', label: '首页', icon: 'material-symbols:home-outline', activeIcon: 'material-symbols:home', exact: true },
  { to: '/themes', label: '主题', icon: 'material-symbols:palette-outline', activeIcon: 'material-symbols:palette' },
  { to: '/upload', label: '发布', icon: 'material-symbols:add-circle-outline', activeIcon: 'material-symbols:add-circle' },
  { to: '/dashboard', label: '我的', icon: 'material-symbols:account-circle-outline', activeIcon: 'material-symbols:account-circle' },
]
const route = useRoute()

function isActive(item: typeof items[number]) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}
</script>

<template>
  <nav class="mobile-navigation" aria-label="移动端主要导航">
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
