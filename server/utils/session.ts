import type { H3Event } from 'h3'
import { clearSession, defineEventHandler, getSession, updateSession } from 'nuxt/server'
import type { CommunityUser } from '#shared/community'

// nuxt-auth-utils 在 Cloudflare 运行时会把请求误判为 WebSocket，写入会话时直接抛 500。
// 这里直接使用 Nuxt 的会话 API，并在需要时把 h3 事件转换成 Nuxt 的可移植事件。
const SESSION_NAME = 'nuxt-auth-session'

type SessionEvent = Parameters<typeof getSession>[0]
type SessionConfig = Parameters<typeof getSession>[1]

// defineEventHandler 会把传入事件转换成可移植事件，用于本地 node 风格事件。
const toPortableEvent = defineEventHandler((event) => {
  return event
})

export interface UserSession {
  user?: CommunityUser
  loggedInAt?: string
}

function sessionEvent(event: H3Event): SessionEvent {
  const raw = event as unknown as SessionEvent & { '~portable'?: boolean }
  if (raw['~portable'] === true || !('node' in event)) {
    return raw
  }
  return toPortableEvent(raw as never) as unknown as SessionEvent
}

function sessionConfig(event: H3Event): SessionConfig {
  const runtimeConfig = useRuntimeConfig(event)
  return {
    name: SESSION_NAME,
    maxAge: Number(runtimeConfig.session?.maxAge ?? 60 * 60 * 24 * 7),
  }
}

export async function readUserSession(event: H3Event): Promise<UserSession> {
  const session = await getSession(sessionEvent(event), sessionConfig(event))
  return session.data as UserSession
}

export async function writeUserSession(event: H3Event, data: UserSession): Promise<void> {
  const config = sessionConfig(event)
  const session = await getSession(sessionEvent(event), config)
  session.data = Object.create(null) as Record<string, unknown>
  await updateSession(sessionEvent(event), config, data as Record<string, unknown>)
}

export async function destroyUserSession(event: H3Event): Promise<void> {
  await clearSession(sessionEvent(event), sessionConfig(event))
}
