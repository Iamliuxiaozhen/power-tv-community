<script setup lang="ts">
import type { FetchError } from 'ofetch'
import type { PublishThemeResponse } from '#shared/community'
import type { ThemeValidationIssue } from '#shared/theme/types'

const props = defineProps<{
  themeId?: string | undefined
  themeName?: string | undefined
  currentVersion?: string | undefined
}>()

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
    issues?: ThemeValidationIssue[]
  }
}

function selectFile(selected: File | undefined): void {
  file.value = undefined
  errorMessage.value = ''
  errorIssues.value = []
  if (!selected) return
  if (!/\.(?:ptheme|zip|json)$/i.test(selected.name)) {
    errorMessage.value = '请选择 .ptheme、.zip 或 .json 格式的主题包。'
    return
  }
  if (selected.size === 0) {
    errorMessage.value = '主题包不能为空。'
    return
  }
  if (selected.size > MAX_FILE_BYTES) {
    errorMessage.value = '主题包不能超过 10 MiB，请压缩图片后重试。'
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
    errorMessage.value = '一次只能上传一个主题包。'
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
    showSnackbar(isUpdate.value ? `v${result.version} 发布成功` : '主题发布成功')
    await navigateTo(`/themes/${encodeURIComponent(result.themeId)}`)
  }
  catch (error) {
    const failure = error as FetchError<UploadErrorBody>
    const statusMessages: Record<number, string> = {
      400: '主题包未通过校验，请检查后重试。',
      401: '登录已过期，请重新登录后发布。',
      403: '只有原上传者可以更新此主题。',
      404: '要更新的主题不存在。',
      409: '主题 ID 或版本已经存在，请修改 theme.json 后重试。',
      410: '已删除的主题不能发布新版本。',
      413: '主题包不能超过 10 MiB。',
      429: '上传过于频繁，请稍后再试。',
    }
    errorMessage.value = failure.data?.data?.message
      ?? statusMessages[failure.status ?? 0]
      ?? '发布失败，请检查网络连接后重试。'
    errorIssues.value = failure.data?.data?.issues ?? []
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
        <h2>{{ isUpdate ? '上传新版本' : '选择主题包' }}</h2>
        <p v-if="isUpdate">为 {{ themeName || themeId }} 发布不可变的新版本。</p>
        <p v-else>主题 ID、名称、版本和作者信息将从包内读取。</p>
      </div>
    </div>

    <div v-if="isUpdate" class="update-notice">
      <Icon name="material-symbols:info-outline" size="20" />
      <span>主题 ID 必须保持为 <code>{{ themeId }}</code><template v-if="currentVersion">，新版本不能重复当前版本 v{{ currentVersion }}</template>。</span>
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
      <strong>拖放主题包到这里</strong>
      <span>或者从设备中选择一个文件</span>
      <span class="button button--tonal button--small">选择主题包</span>
      <small>.ptheme、.zip 或 .json，最大 10 MiB</small>
    </label>

    <div v-else class="upload-file" aria-live="polite">
      <span class="upload-file__icon"><Icon name="material-symbols:deployed-code-outline" size="28" /></span>
      <div class="upload-file__details">
        <strong>{{ file.name }}</strong>
        <span>{{ formatByteSize(file.size) }} · 本地基础检查通过</span>
      </div>
      <span class="upload-file__status"><Icon name="material-symbols:check-circle-outline" size="21" /></span>
      <div class="upload-file__actions">
        <label for="theme-package" class="button button--text button--small">更换文件</label>
        <button type="button" class="button button--text button--small" :disabled="submitting" @click="clearFile">移除</button>
      </div>
    </div>

    <div v-if="errorMessage" class="upload-error" role="alert">
      <Icon name="material-symbols:error-outline" size="22" />
      <div>
        <strong>无法发布</strong>
        <p>{{ errorMessage }}</p>
        <ul v-if="errorIssues.length">
          <li v-for="(issue, index) in errorIssues" :key="`${issue.path}-${index}`">
            <code>{{ issue.path }}</code> {{ issue.message }}
          </li>
        </ul>
      </div>
    </div>

    <div class="upload-form__footer">
      <p><Icon name="material-symbols:shield-outline" size="17" /> 发布前会在服务器执行完整安全校验。</p>
      <button type="submit" class="button" :disabled="!file || submitting">
        <Icon v-if="submitting" name="material-symbols:progress-activity" size="20" class="upload-spinner" />
        <Icon v-else :name="isUpdate ? 'material-symbols:upload' : 'material-symbols:publish'" size="20" />
        {{ submitting ? '正在校验并发布…' : isUpdate ? '发布新版本' : '发布主题' }}
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
