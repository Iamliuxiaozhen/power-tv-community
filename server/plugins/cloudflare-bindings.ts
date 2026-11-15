import { cacheCloudflareEnv } from '../utils/cloudflare'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const env = event.context.cloudflare?.env as unknown as Env | undefined
    if (env) cacheCloudflareEnv(env)
  })
})
