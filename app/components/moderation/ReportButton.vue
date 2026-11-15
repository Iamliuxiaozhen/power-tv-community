<script setup lang="ts">
import type { CreateReportResponse, ReportReason, ReportTargetType } from '#shared/community'

const props = withDefaults(defineProps<{
  targetType: ReportTargetType
  targetId: string
  iconOnly?: boolean
}>(), {
  iconOnly: false,
})

const { t } = useI18n()
const { loggedIn, loginUrl } = useAuth()
const { showSnackbar } = useSnackbar()
const reasonGroup = useId()
const open = ref(false)
const reason = ref<ReportReason>('spam')
const details = ref('')
const submitting = ref(false)
const reported = ref(false)
const submitError = ref('')
const reasons = computed<{ value: ReportReason, label: string, description: string }[]>(() => [
  { value: 'spam', label: t('report.reasons.spam'), description: t('report.reasons.spamDescription') },
  { value: 'malware', label: t('report.reasons.malware'), description: t('report.reasons.malwareDescription') },
  { value: 'copyright', label: t('report.reasons.copyright'), description: t('report.reasons.copyrightDescription') },
  { value: 'other', label: t('report.reasons.other'), description: t('report.reasons.otherDescription') },
])
const targetLabel = computed(() => props.targetType === 'theme' ? t('report.theme') : t('report.comment'))
const canSubmit = computed(() => details.value.length <= 1000 && !submitting.value && !reported.value)

watch(() => [props.targetType, props.targetId], () => {
  open.value = false
  reported.value = false
  submitError.value = ''
})

function openReport(): void {
  if (!loggedIn.value) {
    window.location.assign(loginUrl())
    return
  }
  if (reported.value) return
  submitError.value = ''
  open.value = true
}

async function submitReport(): Promise<void> {
  if (!canSubmit.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await $fetch<CreateReportResponse>('/api/reports', {
      method: 'POST',
      body: {
        targetType: props.targetType,
        targetId: props.targetId,
        reason: reason.value,
        details: details.value,
      },
    })
    reported.value = true
    open.value = false
    details.value = ''
    showSnackbar(t('report.success'))
  }
  catch (error) {
    const status = (error as { status?: number }).status
    submitError.value = status === 401
      ? t('report.errorSession')
      : status === 409
        ? t('report.errorDuplicate')
        : status === 429
          ? t('report.errorRate')
          : status === 404
            ? t('report.errorGone')
            : t('report.errorGeneric')
    if (status === 409) reported.value = true
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <button
    type="button"
    :class="iconOnly ? 'icon-button report-icon-button' : 'button button--text button--small report-button'"
    :aria-label="iconOnly ? t('report.action', { target: targetLabel }) : undefined"
    :title="reported ? t('report.submitted') : t('report.action', { target: targetLabel })"
    :disabled="reported"
    @click="openReport"
  >
    <Icon :name="reported ? 'material-symbols:check-circle-outline' : 'material-symbols:flag-outline'" size="19" />
    <span v-if="!iconOnly">{{ reported ? t('report.submittedAction') : t('report.action', { target: targetLabel }) }}</span>
  </button>

  <AppDialog
    v-model:open="open"
    :title="t('report.action', { target: targetLabel })"
    :description="t('report.dialogDescription')"
  >
    <fieldset class="report-reasons" :disabled="submitting">
      <legend>{{ t('report.reasonLegend') }}</legend>
      <label v-for="item in reasons" :key="item.value" class="report-reason" :class="{ 'is-selected': reason === item.value }">
        <input v-model="reason" type="radio" :name="reasonGroup" :value="item.value">
        <span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span>
      </label>
    </fieldset>
    <label class="report-details">
      <span>{{ t('report.detailsLabel') }}</span>
      <textarea
        v-model="details"
        maxlength="1000"
        rows="4"
        :placeholder="t('report.detailsPlaceholder')"
        :disabled="submitting"
        @input="submitError = ''"
      />
      <small>{{ details.length }} / 1000</small>
    </label>
    <p v-if="submitError" class="report-error" role="alert">{{ submitError }}</p>
    <template #actions>
      <button type="button" class="button button--text" :disabled="submitting" @click="open = false">{{ t('common.cancel') }}</button>
      <button type="button" class="button" :disabled="!canSubmit" @click="submitReport">
        <Icon name="material-symbols:flag-outline" size="18" /> {{ submitting ? t('report.submitting') : t('report.submit') }}
      </button>
    </template>
  </AppDialog>
</template>

<style scoped>
.report-button {
  color: var(--md-on-surface-variant);
}

.report-icon-button {
  width: 34px;
  height: 34px;
  color: var(--md-on-surface-variant);
}

.report-reasons {
  display: grid;
  margin: 0;
  padding: 0;
  border: 0;
  gap: 8px;
}

.report-reasons legend {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 650;
}

.report-reason {
  display: flex;
  min-height: 56px;
  padding: 10px 13px;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-medium);
  align-items: center;
  background: var(--md-surface);
  cursor: pointer;
  gap: 11px;
}

.report-reason.is-selected {
  border-color: var(--md-primary);
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
}

.report-reason input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--md-primary);
  flex: 0 0 auto;
}

.report-reason > span {
  display: flex;
  flex-direction: column;
}

.report-reason strong {
  font-size: 13px;
}

.report-reason small {
  margin-top: 2px;
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.report-reason.is-selected small {
  color: inherit;
  opacity: 0.8;
}

.report-details {
  position: relative;
  display: flex;
  margin-top: 18px;
  flex-direction: column;
  gap: 8px;
}

.report-details > span {
  font-size: 13px;
  font-weight: 650;
}

.report-details textarea {
  width: 100%;
  min-height: 100px;
  padding: 12px 14px 24px;
  border: 1px solid var(--md-outline);
  border-radius: var(--md-radius-medium);
  outline: 0;
  background: var(--md-surface);
  resize: vertical;
}

.report-details textarea:focus {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 2px var(--md-primary);
}

.report-details > small {
  position: absolute;
  right: 12px;
  bottom: 8px;
  color: var(--md-on-surface-variant);
  font-size: 10px;
}

.report-error {
  margin: 12px 0 0;
  color: var(--md-error);
  font-size: 13px;
  line-height: 1.5;
}
</style>
