<script setup lang="ts">
useHead({
  title: '主题制作指南',
  meta: [{ name: 'description', content: '学习如何制作、打包、发布和导入 power-tv 主题包。' }],
})
</script>

<template>
  <div class="guide-page">
    <header class="guide-hero">
      <p class="eyebrow">THEME AUTHORING GUIDE</p>
      <h1>从一组颜色，<br>到客厅里的新风格。</h1>
      <p>power-tv 主题包只包含配置与图片，不包含可执行代码。你可以从官方模板开始，完成配色后把它发布到社区。</p>
      <div class="guide-hero__actions">
        <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/template.theme.json" target="_blank" rel="noreferrer" class="button">
          <Icon name="material-symbols:download" size="20" /> 获取官方模板
        </a>
        <NuxtLink to="/upload" class="button button--tonal"><Icon name="material-symbols:upload" size="20" /> 上传主题</NuxtLink>
      </div>
    </header>

    <section class="guide-section" aria-labelledby="formats-heading">
      <div class="section-heading">
        <div><h2 id="formats-heading">选择主题包格式</h2><p>三种格式使用同一份 theme.json，区别只在是否包含图片资源。</p></div>
      </div>
      <div class="guide-formats">
        <article class="card">
          <span><Icon name="material-symbols:deployed-code-outline" size="25" /></span>
          <h3>.ptheme</h3>
          <p>推荐格式。本质是 ZIP 容器，可以携带预览图和背景图，便于在 power-tv 与社区之间分享。</p>
        </article>
        <article class="card">
          <span><Icon name="material-symbols:folder-zip-outline" size="25" /></span>
          <h3>.zip</h3>
          <p>与 .ptheme 内容完全相同，仅扩展名不同。适合使用常见压缩工具制作和检查。</p>
        </article>
        <article class="card">
          <span><Icon name="material-symbols:data-object" size="25" /></span>
          <h3>.json</h3>
          <p>直接上传 theme.json，适合纯配色主题。不能引用背景图片，也不会包含独立预览图。</p>
        </article>
      </div>
    </section>

    <section class="guide-section guide-steps" aria-labelledby="steps-heading">
      <div class="section-heading">
        <div><h2 id="steps-heading">六步完成一个主题</h2><p>先完成最小可用版本，再逐步补充深色配色和素材。</p></div>
      </div>

      <article class="guide-step">
        <span class="guide-step__number">01</span>
        <div class="guide-step__content">
          <h3>获取模板与 Schema</h3>
          <p>复制官方模板开始编辑。模板包含必需字段；JSON Schema 可以为编辑器提供补全和校验，完整示例可用于了解可选字段的组织方式。</p>
          <div class="guide-links">
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/template.theme.json" target="_blank" rel="noreferrer">主题模板 <Icon name="material-symbols:open-in-new" size="15" /></a>
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/theme.schema.json" target="_blank" rel="noreferrer">JSON Schema <Icon name="material-symbols:open-in-new" size="15" /></a>
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/examples/midnight-forest/theme.json" target="_blank" rel="noreferrer">完整示例 <Icon name="material-symbols:open-in-new" size="15" /></a>
          </div>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">02</span>
        <div class="guide-step__content">
          <h3>填写元数据与版本</h3>
          <p>以下字段决定主题在社区和 power-tv 中的身份。名称与描述可使用字符串，或包含 en、zh-CN 等键的本地化对象。</p>
          <dl class="guide-fields">
            <div><dt>schemaVersion</dt><dd>当前固定为 1。</dd></div>
            <div><dt>id</dt><dd>3–64 位字母、数字、点、下划线或连字符；不能包含连续点号，也不能使用 builtin. 前缀。</dd></div>
            <div><dt>name</dt><dd>必填，每个语言版本最多 64 个字符。</dd></div>
            <div><dt>description</dt><dd>可选，每个语言版本最多 512 个字符。</dd></div>
            <div><dt>version</dt><dd>建议使用主.次.修订，例如 1.0.0；同一 ID 的每个版本只能发布一次。</dd></div>
            <div><dt>minAppVersion</dt><dd>可选，声明主题所需的最低 power-tv 版本。</dd></div>
          </dl>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">03</span>
        <div class="guide-step__content">
          <h3>设计浅色与深色配色</h3>
          <p>schemes.light 是必需项，schemes.dark 可省略。primary 和 surface 足以建立基础风格；其余 Material 3 角色可按需补充，未指定的角色由 power-tv 派生。</p>
          <div class="guide-tip">
            <Icon name="material-symbols:contrast" size="22" />
            <p>建议明确设置 onPrimary、onSurface 等前景角色，并检查文字与背景的对比度。颜色支持 #RGB、#RRGGBB 和 #AARRGGBB。</p>
          </div>
          <p>还可配置 dataViz 图表强调色、系统字体、卡片圆角和仪表盘布局。使用 Material Theme Builder 时，只需将导出结果中的颜色角色整理到 schemes 中。</p>
          <div class="guide-links">
            <a href="https://material-foundation.github.io/material-theme-builder/" target="_blank" rel="noreferrer">Material Theme Builder <Icon name="material-symbols:open-in-new" size="15" /></a>
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-packs.md#字段说明" target="_blank" rel="noreferrer">查看全部字段 <Icon name="material-symbols:open-in-new" size="15" /></a>
          </div>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">04</span>
        <div class="guide-step__content">
          <h3>添加可选图片</h3>
          <p>将 theme.json 放在压缩包根目录。preview.webp 用于社区预览；背景图必须位于 assets 目录，并在 backdrop.image 中填写对应路径。</p>
          <pre class="guide-tree"><code>my-theme.ptheme
├── theme.json
├── preview.webp
└── assets/
    └── backdrop.webp</code></pre>
          <ul class="guide-checklist">
            <li><Icon name="material-symbols:check" size="18" /> 图片使用 PNG、JPEG 或 WebP，扩展名必须与真实格式一致。</li>
            <li><Icon name="material-symbols:check" size="18" /> 背景路径示例：assets/backdrop.webp；dim 取值为 0–0.8。</li>
            <li><Icon name="material-symbols:check" size="18" /> 确保拥有图片、字体等素材的使用和再发布授权。</li>
          </ul>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">05</span>
        <div class="guide-step__content">
          <h3>打包并检查</h3>
          <p>在包含 theme.json 的工作目录中打包。下面命令包含可选预览图和 assets 目录；没有这些素材时，从命令中移除对应项，或直接使用 .json。</p>
          <pre class="guide-command"><code>cd my-theme
zip -r ../my-theme.ptheme theme.json preview.webp assets</code></pre>
          <p>不要先打包外层目录，否则 theme.json 会位于子目录而无法读取。上传前可解压检查结构，并在 power-tv 中预览实际效果。</p>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">06</span>
        <div class="guide-step__content">
          <h3>发布到社区并导入 power-tv</h3>
          <p>使用 GitHub 登录社区后上传主题包。服务端校验通过后会公开展示；后续更新必须保持相同主题 ID，并使用未发布过的新版本号。已发布版本不可覆盖，历史版本仍可下载。</p>
          <p>在 power-tv 中打开“设置 → 主题包 → 导入”，选择下载的 .ptheme、.zip 或 .json 文件，预览确认后应用。</p>
          <div class="guide-links">
            <NuxtLink to="/upload">发布主题 <Icon name="material-symbols:arrow-forward" size="15" /></NuxtLink>
            <a href="https://power-tv.liuxiaozhen.dev" target="_blank" rel="noreferrer">访问 power-tv 官网 <Icon name="material-symbols:open-in-new" size="15" /></a>
          </div>
        </div>
      </article>
    </section>

    <section class="guide-section" aria-labelledby="limits-heading">
      <div class="section-heading">
        <div><h2 id="limits-heading">上传安全限制</h2><p>社区与 power-tv 都会检查不可信主题包，超限或结构不安全的文件会被拒绝。</p></div>
      </div>
      <div class="guide-limits">
        <article><strong>10 MiB</strong><span>上传包最大值</span></article>
        <article><strong>8 MiB</strong><span>ZIP 实际解压总量</span></article>
        <article><strong>64</strong><span>ZIP 条目上限</span></article>
        <article><strong>256 KiB</strong><span>theme.json 上限</span></article>
        <article><strong>4 MiB</strong><span>单张图片上限</span></article>
        <article><strong>400 万像素</strong><span>单张图片像素上限</span></article>
      </div>
      <div class="guide-security-note">
        <Icon name="material-symbols:security" size="24" />
        <p>主题包不能包含脚本、可执行文件、绝对路径或 .. 路径段。ZIP 不支持加密、多磁盘和 ZIP64；重复条目、损坏图片及伪造扩展名也会被拒绝。</p>
      </div>
    </section>

    <section class="guide-more card">
      <span><Icon name="material-symbols:menu-book-outline" size="28" /></span>
      <div><h2>需要完整的字段参考？</h2><p>上游官方文档维护最新的字段、布局预设、导入行为与已知边界。</p></div>
      <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-packs.md" target="_blank" rel="noreferrer" class="button button--tonal">阅读官方文档 <Icon name="material-symbols:open-in-new" size="18" /></a>
    </section>
  </div>
</template>

<style scoped>
.guide-hero {
  max-width: 880px;
  margin: 18px 0 64px;
}

.guide-hero h1 {
  margin-bottom: 22px;
  font-size: clamp(40px, 7vw, 68px);
  letter-spacing: -0.05em;
  line-height: 1.08;
}

.guide-hero > p:not(.eyebrow) {
  max-width: 700px;
  color: var(--md-on-surface-variant);
  font-size: 17px;
  line-height: 1.8;
}

.guide-hero__actions {
  display: flex;
  margin-top: 28px;
  flex-wrap: wrap;
  gap: 12px;
}

.guide-section {
  margin-top: 56px;
}

.guide-formats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.guide-formats article {
  padding: 24px;
  border: 1px solid var(--md-outline-variant);
  background: var(--md-surface-container-lowest);
}

.guide-formats article > span {
  display: inline-flex;
  width: 48px;
  height: 48px;
  margin-bottom: 18px;
  border-radius: 15px;
  align-items: center;
  justify-content: center;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.guide-formats h3 {
  margin-bottom: 8px;
  font-family: monospace;
  font-size: 20px;
}

.guide-formats p,
.guide-step__content > p {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 14px;
  line-height: 1.8;
}

.guide-steps {
  max-width: 900px;
}

.guide-step {
  display: grid;
  padding: 30px 0;
  border-top: 1px solid var(--md-outline-variant);
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 20px;
}

.guide-step__number {
  display: inline-flex;
  width: 48px;
  height: 48px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  font-size: 13px;
  font-weight: 750;
}

.guide-step__content {
  min-width: 0;
}

.guide-step__content h3 {
  margin-bottom: 12px;
  font-size: 23px;
}

.guide-step__content > p + p {
  margin-top: 12px;
}

.guide-links {
  display: flex;
  margin-top: 16px;
  flex-wrap: wrap;
  gap: 10px 20px;
}

.guide-links a {
  display: inline-flex;
  align-items: center;
  color: var(--md-primary);
  font-size: 13px;
  font-weight: 650;
  gap: 5px;
  text-decoration: none;
}

.guide-links a:hover {
  text-decoration: underline;
}

.guide-fields {
  display: grid;
  margin: 20px 0 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.guide-fields > div {
  min-width: 0;
  padding: 14px 16px;
  border-radius: var(--md-radius-medium);
  background: var(--md-surface-container-low);
}

.guide-fields dt {
  margin-bottom: 5px;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
}

.guide-fields dd {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  line-height: 1.65;
}

.guide-tip,
.guide-security-note {
  display: flex;
  margin: 18px 0;
  padding: 16px 18px;
  border-radius: var(--md-radius-large);
  align-items: flex-start;
  background: var(--md-tertiary-container);
  color: var(--md-on-tertiary-container);
  gap: 12px;
}

.guide-tip .icon,
.guide-security-note .icon {
  flex: 0 0 auto;
}

.guide-tip p,
.guide-security-note p {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
}

.guide-tree,
.guide-command {
  margin: 18px 0;
  padding: 18px;
  overflow-x: auto;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-medium);
  background: var(--md-surface-container-lowest);
  color: var(--md-on-surface);
  font-size: 13px;
  line-height: 1.8;
}

.guide-checklist {
  display: grid;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;
  gap: 10px;
}

.guide-checklist li {
  display: flex;
  align-items: flex-start;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  line-height: 1.7;
  gap: 8px;
}

.guide-checklist .icon {
  margin-top: 2px;
  color: var(--md-primary);
  flex: 0 0 auto;
}

.guide-limits {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.guide-limits article {
  display: flex;
  min-height: 100px;
  padding: 18px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  justify-content: center;
  flex-direction: column;
  background: var(--md-surface-container-lowest);
}

.guide-limits strong {
  font-size: 24px;
}

.guide-limits span {
  margin-top: 5px;
  color: var(--md-on-surface-variant);
  font-size: 12px;
}

.guide-more {
  display: grid;
  margin-top: 56px;
  padding: 26px;
  align-items: center;
  background: var(--md-surface-container-low);
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 18px;
}

.guide-more > span {
  display: inline-flex;
  width: 54px;
  height: 54px;
  border-radius: 17px;
  align-items: center;
  justify-content: center;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.guide-more h2 {
  margin-bottom: 5px;
  font-size: 20px;
}

.guide-more p {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .guide-hero {
    margin-bottom: 44px;
  }

  .guide-formats,
  .guide-limits {
    grid-template-columns: 1fr;
  }

  .guide-fields {
    grid-template-columns: 1fr;
  }

  .guide-more {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .guide-more .button {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .guide-hero h1 {
    font-size: 39px;
  }

  .guide-hero__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .guide-step {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .guide-step__number {
    width: 42px;
    height: 42px;
    border-radius: 14px;
  }

  .guide-more {
    grid-template-columns: 1fr;
  }
}
</style>
