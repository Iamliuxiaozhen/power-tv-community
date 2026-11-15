<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: computed(() => t('guide.metaTitle')),
  meta: [{ name: 'description', content: computed(() => t('guide.metaDescription')) }],
})
</script>

<template>
  <div class="guide-page">
    <header class="guide-hero">
      <p class="eyebrow">{{ t('guide.eyebrow') }}</p>
      <h1>{{ t('guide.heroTitleLine1') }}<br>{{ t('guide.heroTitleLine2') }}</h1>
      <p>{{ t('guide.heroDescription') }}</p>
      <div class="guide-hero__actions">
        <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/template.theme.json" target="_blank" rel="noreferrer" class="button">
          <Icon name="material-symbols:download" size="20" /> {{ t('guide.getTemplate') }}
        </a>
        <NuxtLink to="/upload" class="button button--tonal"><Icon name="material-symbols:upload" size="20" /> {{ t('guide.uploadTheme') }}</NuxtLink>
      </div>
    </header>

    <section class="guide-section" aria-labelledby="formats-heading">
      <div class="section-heading">
        <div><h2 id="formats-heading">{{ t('guide.formatsTitle') }}</h2><p>{{ t('guide.formatsDescription') }}</p></div>
      </div>
      <div class="guide-formats">
        <article class="card">
          <span><Icon name="material-symbols:deployed-code-outline" size="25" /></span>
          <h3>.ptheme</h3>
          <p>{{ t('guide.pthemeDescription') }}</p>
        </article>
        <article class="card">
          <span><Icon name="material-symbols:folder-zip-outline" size="25" /></span>
          <h3>.zip</h3>
          <p>{{ t('guide.zipDescription') }}</p>
        </article>
        <article class="card">
          <span><Icon name="material-symbols:data-object" size="25" /></span>
          <h3>.json</h3>
          <p>{{ t('guide.jsonDescription') }}</p>
        </article>
      </div>
    </section>

    <section class="guide-section guide-steps" aria-labelledby="steps-heading">
      <div class="section-heading">
        <div><h2 id="steps-heading">{{ t('guide.stepsTitle') }}</h2><p>{{ t('guide.stepsDescription') }}</p></div>
      </div>

      <article class="guide-step">
        <span class="guide-step__number">01</span>
        <div class="guide-step__content">
          <h3>{{ t('guide.step1Title') }}</h3>
          <p>{{ t('guide.step1Description') }}</p>
          <div class="guide-links">
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/template.theme.json" target="_blank" rel="noreferrer">{{ t('guide.templateLink') }} <Icon name="material-symbols:open-in-new" size="15" /></a>
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/theme.schema.json" target="_blank" rel="noreferrer">{{ t('guide.schemaLink') }} <Icon name="material-symbols:open-in-new" size="15" /></a>
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-pack/examples/midnight-forest/theme.json" target="_blank" rel="noreferrer">{{ t('guide.exampleLink') }} <Icon name="material-symbols:open-in-new" size="15" /></a>
          </div>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">02</span>
        <div class="guide-step__content">
          <h3>{{ t('guide.step2Title') }}</h3>
          <p>{{ t('guide.step2Description') }}</p>
          <dl class="guide-fields">
            <div><dt>schemaVersion</dt><dd>{{ t('guide.schemaVersionDescription') }}</dd></div>
            <div><dt>id</dt><dd>{{ t('guide.idDescription') }}</dd></div>
            <div><dt>name</dt><dd>{{ t('guide.nameDescription') }}</dd></div>
            <div><dt>description</dt><dd>{{ t('guide.descriptionFieldDescription') }}</dd></div>
            <div><dt>version</dt><dd>{{ t('guide.versionDescription') }}</dd></div>
            <div><dt>minAppVersion</dt><dd>{{ t('guide.minAppVersionDescription') }}</dd></div>
          </dl>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">03</span>
        <div class="guide-step__content">
          <h3>{{ t('guide.step3Title') }}</h3>
          <p>{{ t('guide.step3Description') }}</p>
          <div class="guide-tip">
            <Icon name="material-symbols:contrast" size="22" />
            <p>{{ t('guide.contrastTip') }}</p>
          </div>
          <p>{{ t('guide.extraFieldsDescription') }}</p>
          <div class="guide-links">
            <a href="https://material-foundation.github.io/material-theme-builder/" target="_blank" rel="noreferrer">{{ t('guide.materialBuilderLink') }} <Icon name="material-symbols:open-in-new" size="15" /></a>
            <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-packs.md#字段说明" target="_blank" rel="noreferrer">{{ t('guide.allFieldsLink') }} <Icon name="material-symbols:open-in-new" size="15" /></a>
          </div>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">04</span>
        <div class="guide-step__content">
          <h3>{{ t('guide.step4Title') }}</h3>
          <p>{{ t('guide.step4Description') }}</p>
          <pre class="guide-tree"><code>my-theme.ptheme
├── theme.json
├── preview.webp
└── assets/
    └── backdrop.webp</code></pre>
          <ul class="guide-checklist">
            <li><Icon name="material-symbols:check" size="18" /> {{ t('guide.checklistImages') }}</li>
            <li><Icon name="material-symbols:check" size="18" /> {{ t('guide.checklistBackdrop') }}</li>
            <li><Icon name="material-symbols:check" size="18" /> {{ t('guide.checklistLicense') }}</li>
          </ul>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">05</span>
        <div class="guide-step__content">
          <h3>{{ t('guide.step5Title') }}</h3>
          <p>{{ t('guide.step5Description') }}</p>
          <pre class="guide-command"><code>cd my-theme
zip -r ../my-theme.ptheme theme.json preview.webp assets</code></pre>
          <p>{{ t('guide.packagingNote') }}</p>
        </div>
      </article>

      <article class="guide-step">
        <span class="guide-step__number">06</span>
        <div class="guide-step__content">
          <h3>{{ t('guide.step6Title') }}</h3>
          <p>{{ t('guide.step6Description') }}</p>
          <p>{{ t('guide.importHelp') }}</p>
          <div class="guide-links">
            <NuxtLink to="/upload">{{ t('guide.publishTheme') }} <Icon name="material-symbols:arrow-forward" size="15" /></NuxtLink>
            <a href="https://power-tv.liuxiaozhen.dev" target="_blank" rel="noreferrer">{{ t('guide.visitWebsite') }} <Icon name="material-symbols:open-in-new" size="15" /></a>
          </div>
        </div>
      </article>
    </section>

    <section class="guide-section" aria-labelledby="limits-heading">
      <div class="section-heading">
        <div><h2 id="limits-heading">{{ t('guide.limitsTitle') }}</h2><p>{{ t('guide.limitsDescription') }}</p></div>
      </div>
      <div class="guide-limits">
        <article><strong>10 MiB</strong><span>{{ t('guide.limitUploadMax') }}</span></article>
        <article><strong>8 MiB</strong><span>{{ t('guide.limitZipUncompressed') }}</span></article>
        <article><strong>64</strong><span>{{ t('guide.limitZipEntries') }}</span></article>
        <article><strong>256 KiB</strong><span>{{ t('guide.limitManifest') }}</span></article>
        <article><strong>4 MiB</strong><span>{{ t('guide.limitImage') }}</span></article>
        <article><strong>{{ t('guide.limitImagePixelsValue') }}</strong><span>{{ t('guide.limitImagePixels') }}</span></article>
      </div>
      <div class="guide-security-note">
        <Icon name="material-symbols:security" size="24" />
        <p>{{ t('guide.securityNote') }}</p>
      </div>
    </section>

    <section class="guide-more card">
      <span><Icon name="material-symbols:menu-book-outline" size="28" /></span>
      <div><h2>{{ t('guide.moreTitle') }}</h2><p>{{ t('guide.moreDescription') }}</p></div>
      <a href="https://github.com/Iamliuxiaozhen/power-tv/blob/main/docs/theme-packs.md" target="_blank" rel="noreferrer" class="button button--tonal">{{ t('guide.readDocs') }} <Icon name="material-symbols:open-in-new" size="18" /></a>
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
