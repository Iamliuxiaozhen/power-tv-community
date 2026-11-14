export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  devtools: { enabled: false },
  compatibilityDate: '2026-11-14',
  nitro: {
    preset: 'cloudflare_pages',
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})
