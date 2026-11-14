export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/icon', 'nitro-cloudflare-dev', 'nuxt-auth-utils'],
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
