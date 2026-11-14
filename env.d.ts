// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./worker-configuration.d.ts" />

declare module 'h3' {
  interface H3EventContext {
    cloudflare: {
      env: Env
      context: ExecutionContext
      request: Request
    }
  }
}

export {}
