<script setup lang="ts">
import type { FetchError } from 'ofetch'
import type { PublishThemeResponse } from '#shared/community'
import type { ThemeValidationIssue } from '#shared/theme/types'

const props = defineProps<{
  themeId?: string | undefined
  themeName?: string | undefined
  currentVersion?: string | undefined
}>()

const { t, te } = useI18n()
const MAX_FILE_BYTES = 10 * 1024 * 1024
const file = shallowRef<File>()
const dragActive = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const errorIssues = ref<ThemeValidationIssue[]>([])
const { showSnackbar } = useSnackbar()
const isUpdate = computed(() => Boolean(props.themeId))
const endpoint = computed(() => props.themeId
  ? `/api/themes/${encodeURIComponent(props.themeId)}/versions`
  : '/api/themes')

interface UploadErrorBody {
  data?: {
    message?: string
    messageKey?: string
    issues?: ThemeValidationIssue[]
  }
}

function issueMessage(issue: ThemeValidationIssue): string {
  if (!issue.code) return issue.message
  const key = `errors.issue.${issue.code}`
  return te(key) ? t(key, issue.params ?? {}) : issue.message
}

function errorMessageFromKey(key: string | undefined): string | undefined {
  if (!key) return undefined
  const lookup = `errors.issue.${key}`
  return te(lookup) ? t(lookup) : undefined
}

function selectFile(selected: File | undefined): void {
  file.value = undefined
  errorMessage.value = ''
  errorIssues.value = []
  if (!selected) return
  if (!/\.(?:ptheme|zip|json)$/i.test(selected.name)) {
    errorMessage.value = t('uploadForm.validation.invalidType')
    return
  }
  if (selected.size === 0) {
    errorMessage.value = t('uploadForm.validation.empty')
    return
  }
  if (selected.size > MAX_FILE_BYTES) {
    errorMessage.value = t('uploadForm.validation.tooLarge')
    return
  }
  file.value = selected
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  selectFile(input.files?.[0])
  input.value = ''
}

function onDrop(event: DragEvent): void {
  dragActive.value = false
  if (submitting.value) return
  const files = event.dataTransfer?.files
  if (files && files.length > 1) {
    file.value = undefined
    errorMessage.value = t('uploadForm.validation.multiple')
    errorIssues.value = []
    return
  }
  selectFile(files?.[0])
}

function clearFile(): void {
  file.value = undefined
  errorMessage.value = ''
  errorIssues.value = []
}

async function submit(): Promise<void> {
  if (!file.value || submitting.value) return
  submitting.value = true
  errorMessage.value = ''
  errorIssues.value = []
  const body = new FormData()
  body.append('file', file.value, file.value.name)

  try {
    const result = await $fetch<PublishThemeResponse>(endpoint.value, { method: 'POST', body })
    showSnackbar(isUpdate.value ? t('uploadForm.successUpdate', { version: result.version }) : t('uploadForm.successCreate'))
    await navigateTo(`/themes/${encodeURIComponent(result.themeId)}`)
  }
  catch (error) {
    const failure = error as FetchError<UploadErrorBody>
    const statusMessages: Record<number, string> = {
      400: t('uploadForm.error.invalid'),
      401: t('uploadForm.error.session'),
      403: t('uploadForm.error.forbidden'),
      404: t('uploadForm.error.notFound'),
      409: t('uploadForm.error.conflict'),
      410: t('uploadForm.error.deleted'),
      413: t('uploadForm.error.tooLarge'),
      429: t('uploadForm.error.rateLimited'),
    }
    const errorBody = failure.data?.data
    errorMessage.value = errorMessageFromKey(errorBody?.messageKey)
      ?? errorBody?.message
      ?? statusMessages[failure.status ?? 0]
      ?? t('uploadForm.error.generic')
    errorIssues.value = errorBody?.issues ?? []
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="upload-form card" @submit.prevent="submit">
    <div class="upload-form__heading">
      <span class="upload-form__icon"><Icon :name="isUpdate ? 'material-symbols:upload' : 'material-symbols:add-box-outline'" size="26" /></span>
      <div>
        <h2>{{ isUpdate ? t('uploadForm.updateHeading') : t('uploadForm.createHeading') }}</h2>
        <p v-if="isUpdate">{{ t('uploadForm.updateDescription', { name: themeName || themeId }) }}</p>
        <p v-else>{{ t('uploadForm.createDescription') }}</p>
      </div>
    </div>

    <div v-if="isUpdate" class="update-notice">
      <Icon name="material-symbols:info-outline" size="20" />
      <span>{{ t('uploadForm.updateNoticePrefix') }} <code>{{ themeId }}</code>{{ t('uploadForm.updateNoticeSuffix') }}<template v-if="currentVersion">{{ t('uploadForm.updateNoticeVersion', { version: currentVersion }) }}</template></span>
    </div>

    <input id="theme-package" class="visually-hidden" type="file" accept=".ptheme,.zip,.json,application/zip,application/json" :disabled="submitting" @change="onFileChange">

    <label
      v-if="!file"
      for="theme-package"
      class="upload-dropzone"
      :class="{ 'is-dragging': dragActive, 'has-error': errorMessage }"
      @dragenter.prevent="dragActive = true"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
    >
      <span class="upload-dropzone__icon"><Icon name="material-symbols:cloud-upload-outline" size="38" /></span>
      <strong>{{ t('uploadForm.dropTitle') }}</strong>
      <span>{{ t('uploadForm.dropSubtitle') }}</span>
      <span class="button button--tonal button--small">{{ t('uploadForm.chooseFile') }}</span>
      <small>{{ t('uploadForm.dropHint') }}</small>
    </label>

    <div v-else class="upload-file" aria-live="polite">
      <span class="upload-file__icon"><Icon name="material-symbols:deployed-code-outline" size="28" /></span>
      <div class="upload-file__details">
        <strong>{{ file.name }}</strong>
        <span>{{ formatByteSize(file.size) }} · {{ t('uploadForm.localCheckPassed') }}</span>
      </div>
      <span class="upload-file__status"><Icon name="material-symbols:check-circle-outline" size="21" /></span>
      <div class="upload-file__actions">
        <label for="theme-package" class="button button--text button--small">{{ t('uploadForm.changeFile') }}</label>
        <button type="button" class="button button--text button--small" :disabled="submitting" @click="clearFile">{{ t('uploadForm.remove') }}</button>
      </div>
    </div>

    <div v-if="errorMessage" class="upload-error" role="alert">
      <Icon name="material-symbols:error-outline" size="22" />
      <div>
        <strong>{{ t('uploadForm.errorTitle') }}</strong>
        <p>{{ errorMessage }}</p>
        <ul v-if="errorIssues.length">
          <li v-for="(issue, index) in errorIssues" :key="`${issue.path}-${index}`">
            <code>{{ issue.path }}</code> {{ issueMessage(issue) }}
          </li>
        </ul>
      </div>
    </div>

    <div class="upload-form__footer">
      <p><Icon name="material-symbols:shield-outline" size="17" /> {{ t('uploadForm.securityNote') }}</p>
      <button type="submit" class="button" :disabled="!file || submitting">
        <Icon v-if="submitting" name="material-symbols:progress-activity" size="20" class="upload-spinner" />
        <Icon v-else :name="isUpdate ? 'material-symbols:upload' : 'material-symbols:publish'" size="20" />
        {{ submitting ? t('uploadForm.submitting') : isUpdate ? t('uploadForm.submitUpdate') : t('uploadForm.submitCreate') }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.upload-form {
  padding: clamp(20px, 4vw, 32px);
  background: var(--md-surface-container-low);
}

.upload-form__heading {
  display: flex;
  margin-bottom: 24px;
  align-items: center;
  gap: 14px;
}

.upload-form__icon {
  display: inline-flex;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  flex: 0 0 auto;
}

.upload-form__heading h2 {
  margin: 0 0 4px;
  font-size: 22px;
}

.upload-form__heading p {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 13px;
}

.update-notice {
  display: flex;
  margin-bottom: 20px;
  padding: 13px 15px;
  border-radius: var(--md-radius-medium);
  align-items: flex-start;
  background: var(--md-tertiary-container);
  color: var(--md-on-tertiary-container);
  font-size: 13px;
  gap: 9px;
}

.update-notice .icon {
  flex: 0 0 auto;
}

.update-notice code {
  overflow-wrap: anywhere;
}

.upload-dropzone {
  display: flex;
  min-height: 330px;
  padding: 32px 20px;
  border: 2px dashed var(--md-outline);
  border-radius: var(--md-radius-extra-large);
  align-items: center;
  justify-content: center;
  background: var(--md-surface-container-lowest);
  cursor: pointer;
  text-align: center;
  flex-direction: column;
  transition: border-color var(--md-motion-short), background var(--md-motion-short);
}

.upload-dropzone:hover,
.upload-dropzone.is-dragging {
  border-color: var(--md-primary);
  background: color-mix(in srgb, var(--md-primary-container) 24%, var(--md-surface-container-lowest));
}

.upload-dropzone.has-error {
  border-color: var(--md-error);
}

.upload-dropzone:focus-within {
  outline: 3px solid var(--md-primary);
  outline-offset: 3px;
}

.upload-dropzone__icon {
  display: inline-flex;
  width: 72px;
  height: 72px;
  margin-bottom: 18px;
  border-radius: 24px;
  align-items: center;
  justify-content: center;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
}

.upload-dropzone > strong {
  margin-bottom: 6px;
  font-size: 20px;
}

.upload-dropzone > strong + span {
  margin-bottom: 20px;
  color: var(--md-on-surface-variant);
  font-size: 14px;
}

.upload-dropzone > small {
  margin-top: 16px;
  color: var(--md-on-surface-variant);
  font-size: 12px;
}

.upload-file {
  display: grid;
  min-height: 150px;
  padding: 24px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-extra-large);
  align-items: center;
  background: var(--md-surface-container-lowest);
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 16px;
}

.upload-file__icon {
  display: inline-flex;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.upload-file__details {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.upload-file__details strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-file__details span {
  color: var(--md-on-surface-variant);
  font-size: 13px;
}

.upload-file__status {
  color: var(--md-primary);
}

.upload-file__actions {
  display: flex;
  grid-column: 2 / -1;
  gap: 4px;
}

.upload-file__actions label {
  cursor: pointer;
}

.upload-error {
  display: flex;
  margin-top: 18px;
  padding: 16px;
  border-radius: var(--md-radius-medium);
  align-items: flex-start;
  background: var(--md-error-container);
  color: var(--md-on-error-container);
  gap: 10px;
}

.upload-error > .icon {
  flex: 0 0 auto;
}

.upload-error strong {
  font-size: 14px;
}

.upload-error p {
  margin: 3px 0 0;
  font-size: 13px;
}

.upload-error ul {
  max-height: 180px;
  margin: 10px 0 0;
  padding-left: 20px;
  overflow: auto;
  font-size: 12px;
}

.upload-error code {
  font-weight: 650;
}

.upload-form__footer {
  display: flex;
  margin-top: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.upload-form__footer p {
  display: flex;
  margin: 0;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  gap: 6px;
}

.upload-spinner {
  animation: upload-spin 1s linear infinite;
}

@keyframes upload-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 520px) {
  .upload-dropzone {
    min-height: 290px;
  }

  .upload-file {
    padding: 20px;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .upload-file__status {
    display: none;
  }

  .upload-file__actions {
    grid-column: 1 / -1;
  }

  .upload-form__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .upload-form__footer .button {
    width: 100%;
  }
}
</style>
