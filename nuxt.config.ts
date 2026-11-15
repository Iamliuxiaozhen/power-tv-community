export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/icon', 'nitro-cloudflare-dev', 'nuxt-auth-utils', '@nuxtjs/i18n'],
  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    langDir: 'locales',
    locales: [
      { code: 'zh-CN', language: 'zh-CN', name: '简体中文', file: 'zh-CN.json' },
      { code: 'zh-TW', language: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'power-tv-locale',
      redirectOn: 'root',
      fallbackLocale: 'zh-CN',
    },
  },
  css: ['@fontsource-variable/roboto', '~/assets/css/main.css'],
  icon: {
    serverBundle: {
      collections: ['material-symbols'],
    },
  },
  devtools: { enabled: false },
  runtimeConfig: {
    appUrl: 'http://localhost:3000',
    session: {
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  compatibilityDate: '2026-11-14',
  nitro: {
    preset: 'cloudflare_pages',
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
