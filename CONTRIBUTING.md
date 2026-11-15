# 贡献指南

本文件面向参与 power-tv 主题社区开发与维护的人类贡献者。开始之前，建议先阅读 [README](./README.md) 和 [power-tv 主题包文档](https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-packs.md)。

## 技术栈

- Nuxt 4.6、Vue 3、TypeScript
- Cloudflare Pages（Nitro `cloudflare_pages` 预设，产物目录 `dist`）
- Cloudflare D1（关系数据）、私有 R2（主题包与图片）
- GitHub OAuth（通过 `nuxt-auth-utils`），无独立账号体系
- Vitest、ESLint、`nuxt typecheck`

## 本地开发

需要 Node.js 24 及以上版本。

```bash
npm ci
cp .env.example .dev.vars   # 填入本地配置，.dev.vars 不应提交
npm run dev
```

`.dev.vars` 用于本地 Nitro/Cloudflare 环境，生产环境在 Cloudflare Pages 中以环境变量或 Secret 配置。

### 环境变量

| 名称 | 说明 |
| --- | --- |
| `NUXT_APP_URL` | 站点对外地址。本地为 `http://localhost:3000`，生产为正式域名（`https`）。 |
| `NUXT_APP_SECRET` | 会话加密密钥，至少 32 位随机字符。 |
| `NUXT_OAUTH_GITHUB_CLIENT_ID` | GitHub OAuth App 的 Client ID。 |
| `NUXT_OAUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret。 |
| `ADMIN_GITHUB_IDS` | 管理员 GitHub 数字 ID，多个以英文逗号分隔，例如 `12345678,23456789`。 |

`NUXT_APP_SECRET` 可以用 `openssl rand -base64 32` 生成。`ADMIN_GITHUB_IDS` 使用数字 ID 而非用户名，可通过 `https://api.github.com/users/<用户名>` 的 `id` 字段获取。

### GitHub OAuth App

在 GitHub 的 Settings → Developer settings → OAuth Apps 中新建应用：

- Homepage URL：`NUXT_APP_URL`
- Authorization callback URL：`{NUXT_APP_URL}/auth/github`

本地开发时 callback 为 `http://localhost:3000/auth/github`。请为本地和生产分别创建应用，避免共用同一套密钥。

## 数据库与对象存储

### D1

迁移文件位于 `migrations/`，绑定配置位于 `wrangler.toml`。部署前请确认其中的 `database_id` 与自己的 D1 数据库一致。

```bash
# 本地 D1 应用迁移
npx wrangler d1 migrations apply power-tv-community --local

# 远程 D1 应用迁移（受 Cloudflare 账号权限约束）
npx wrangler d1 migrations apply power-tv-community --remote
```

新增表结构变更时，请新建迁移文件，不要修改已经执行过的历史迁移。

### R2

主题包存放在私有桶 `power-tv-themes` 中，通过绑定 `THEME_BUCKET` 访问。请勿为桶配置公共访问域名或公开开发 URL；所有下载都经过服务端鉴权与计数。

```bash
npx wrangler r2 bucket create power-tv-themes
```

### 本地 Pages 预览

```bash
npm run build
npx wrangler pages dev dist
```

该命令会以本地 D1/R2 模拟 Pages 运行环境。真实 OAuth 登录需要有效的 GitHub OAuth App 配置。

## 开发检查

提交前请依次运行：

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

只改动文档或纯服务端逻辑时，也至少运行与改动相关的测试和 `npm run lint`。

## 主题 Schema 同步

社区的主题校验以 power-tv 上游规范为准：

- 仓库内 Schema：`shared/theme/theme.schema.json`
- 类型定义：`shared/theme/types.ts`
- 校验入口：`shared/theme/validator.ts`
- 包级限制：`server/utils/theme-archive.ts`
- 预编译校验器：`shared/theme/theme-validator.generated.ts`，修改 `theme.schema.json` 后运行 `npm run theme:validator` 重新生成，不要手工编辑。

上游更新主题 Schema 时，请同步上述文件并补充 `tests/unit/` 中的对应测试，确保社区与 App 对同一主题包的判断一致。指南页面 `app/pages/guide.vue` 中的限制数值也需一并核对。

## 社区治理

管理员通过 `/admin/reports` 处理举报。权限只由服务端读取 `ADMIN_GITHUB_IDS` 判断，前端隐藏按钮不作为权限边界。隐藏内容后可以恢复；作者软删除的主题或评论不可通过管理接口恢复。

## 提交与 Pull Request

- 一个提交只做一件事，功能验证通过后立即提交，不要把多个不相关改动混在一起。
- 提交信息使用英文，推荐 `type: summary` 形式，例如 `feat: add community moderation`、`fix: correct download counter`。
- 不要提交 `.dev.vars`、构建产物 `dist/`、`.nuxt` 或其他本地生成文件。
- 提交前检查 `git diff --check`，避免尾随空格和冲突标记。
- Pull Request 请说明改动目的、验证方式和涉及的用户可见行为；涉及界面的改动建议附上桌面与移动端截图。

## 行为约定

- 尊重其他创作者与贡献者，讨论聚焦于代码和产品行为。
- 不要上传无权再发布的图片、字体等素材。
- 发现安全问题时，请通过私密渠道联系维护者，不要在公开 Issue 中披露可利用细节。
