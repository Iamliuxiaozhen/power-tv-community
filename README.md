# power-tv-community

power-tv 主题社区。浏览、发布和讨论 [power-tv](https://github.com/Iamliuxiaozhen/power-tv) 电视主题。

主题包上传后保存在私有 Cloudflare R2 中，元数据与互动数据存放在 Cloudflare D1。社区没有独立账号体系，直接使用 GitHub 登录。

## 功能

- 主题目录：搜索、排序、创作者主页与响应式布局。
- 主题详情：Material 3 配色预览、包内预览图、版本历史与 SHA-256 校验值。
- 主题发布：上传 `.ptheme`、`.zip` 或 `.json`，服务端完成结构与安全校验；同一主题的每个版本不可变。
- 社区互动：点赞、收藏、评论，以及“我的发布 / 我的点赞 / 我的收藏”个人面板。
- 社区治理：举报主题或评论，管理员处理队列支持驳回、隐藏和恢复内容。
- 主题制作指南：站内提供格式说明、字段参考、打包与上传步骤。

## 技术栈

- [Nuxt 4](https://nuxt.com/) + Vue 3 + TypeScript
- Cloudflare Pages 托管，Nitro `cloudflare_pages` 预设
- Cloudflare D1（数据）、私有 R2（主题包与图片）
- GitHub OAuth（`nuxt-auth-utils`）
- Vitest、ESLint、`nuxt typecheck`

## 相关链接

- [power-tv 官网](https://power-tv.liuxiaozhen.dev)
- [power-tv 源码与主题文档](https://github.com/Iamliuxiaozhen/power-tv)
- 主题制作指南：社区站内路径 `/guide`
- [贡献指南](./CONTRIBUTING.md)

## 参与贡献

欢迎提交 Issue 和 Pull Request。开发环境、Cloudflare 资源配置、测试命令与提交约定见 [CONTRIBUTING.md](./CONTRIBUTING.md)。
