<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">跳到主要内容</a>
    <AppHeader />
    <main id="main-content" class="app-main" tabindex="-1">
      <slot />
    </main>
    <AppFooter />
    <AppMobileNavigation />
    <AppSnackbar />
  </div>
</template>
