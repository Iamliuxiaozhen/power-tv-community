<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <div class="app-footer__intro">
        <span class="brand__mark" aria-hidden="true">
          <Icon name="material-symbols:palette-outline" size="22" />
        </span>
        <div>
          <strong>power-tv 主题社区</strong>
          <p>发现、分享和管理你的电视主题。</p>
        </div>
      </div>
      <nav class="app-footer__links" aria-label="相关链接">
        <NuxtLink to="/guide">主题制作指南</NuxtLink>
        <a href="https://power-tv.liuxiaozhen.dev" target="_blank" rel="noreferrer">power-tv 官网</a>
        <a href="https://github.com/Iamliuxiaozhen/power-tv" target="_blank" rel="noreferrer">应用源码</a>
        <a href="https://github.com/Iamliuxiaozhen/power-tv-community" target="_blank" rel="noreferrer">社区源码</a>
      </nav>
    </div>
  </footer>
</template>
