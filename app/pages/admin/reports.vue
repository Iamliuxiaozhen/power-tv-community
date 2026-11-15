<script setup lang="ts">
import type {
  AdminReport,
  AdminReportListResponse,
  ModerateReportResponse,
  ReportAction,
  ReportReason,
  ReportStatus,
} from '#shared/community'

const { t } = useI18n()
const { formatDate } = useFormatters()
const route = useRoute()
const { loggedIn, loginUrl, ready } = useAuth()
const { showSnackbar } = useSnackbar()
const status = computed<ReportStatus>(() => {
  const value = route.query.status
  return value === 'resolved' || value === 'dismissed' ? value : 'pending'
})
const cursor = computed(() => typeof route.query.cursor === 'string' ? route.query.cursor : undefined)
const requestFetch = useRequestFetch()
const { data, pending, error, refresh } = await useAsyncData<AdminReportListResponse | null>(
  'admin-report-queue',
  () => loggedIn.value
    ? requestFetch<AdminReportListResponse>('/api/admin/reports', {
        query: { status: status.value, cursor: cursor.value, limit: 20 },
      })
    : Promise.resolve(null),
  { watch: [status, cursor, loggedIn] },
)

const tabs = computed<{ value: ReportStatus, label: string, icon: string }[]>(() => [
  { value: 'pending', label: t('admin.statusPending'), icon: 'material-symbols:pending-actions' },
  { value: 'resolved', label: t('admin.statusResolved'), icon: 'material-symbols:check-circle-outline' },
  { value: 'dismissed', label: t('admin.statusDismissed'), icon: 'material-symbols:do-not-disturb-on-outline' },
])
const reasonLabels = computed<Record<ReportReason, string>>(() => ({
  spam: t('report.reasons.spam'),
  malware: t('report.reasons.malware'),
  copyright: t('report.reasons.copyright'),
  other: t('report.reasons.other'),
}))
const statusLabels = computed<Record<ReportStatus, string>>(() => ({
  pending: t('admin.statusPending'),
  resolved: t('admin.statusResolved'),
  dismissed: t('admin.statusDismissed'),
}))
const actionMessages = computed<Record<ReportAction, string>>(() => ({
  resolve: t('admin.actionResolved'),
  dismiss: t('admin.actionDismissed'),
  hide: t('admin.actionHidden'),
  restore: t('admin.actionRestored'),
}))

const activeAction = ref<{ id: string, action: ReportAction } | null>(null)
const queueActionError = ref('')
const actionTarget = ref<AdminReport | null>(null)
const confirmationAction = ref<'hide' | 'restore' | null>(null)
const confirmationOpen = ref(false)
const dialogError = ref('')
const confirmationTitle = computed(() => {
  if (!actionTarget.value || !confirmationAction.value) return ''
  const target = actionTarget.value.targetType === 'theme' ? t('report.theme') : t('report.comment')
  return confirmationAction.value === 'hide'
    ? t('admin.hideDialogTitle', { target })
    : t('admin.restoreDialogTitle', { target })
})
const confirmationDescription = computed(() => {
  if (!actionTarget.value || !confirmationAction.value) return ''
  if (confirmationAction.value === 'restore') return t('admin.restoreDialogDescription')
  return actionTarget.value.targetType === 'theme'
    ? t('admin.hideThemeDescription')
    : t('admin.hideCommentDescription')
})

useHead({ title: computed(() => t('admin.metaTitle')) })

function targetStatus(report: AdminReport): string {
  return report.comment?.status ?? report.theme.status
}

function targetStatusLabel(report: AdminReport): string {
  const value = targetStatus(report)
  const labels: Record<string, string> = {
    published: t('admin.targetPublished'),
    visible: t('admin.targetVisible'),
    hidden: t('admin.targetHidden'),
    deleted: t('admin.targetDeleted'),
  }
  return labels[value] ?? value
}

function canHide(report: AdminReport): boolean {
  return report.status === 'pending' && (report.targetType === 'theme'
    ? report.theme.status === 'published'
    : report.comment?.status === 'visible')
}

function canRestore(report: AdminReport): boolean {
  return report.status === 'resolved' && (report.targetType === 'theme'
    ? report.theme.status === 'hidden'
    : report.comment?.status === 'hidden')
}

function isActive(report: AdminReport): boolean {
  return activeAction.value?.id === report.id
}

function requestAction(report: AdminReport, action: ReportAction): void {
  queueActionError.value = ''
  if (action === 'hide' || action === 'restore') {
    actionTarget.value = report
    confirmationAction.value = action
    dialogError.value = ''
    confirmationOpen.value = true
    return
  }
  void executeAction(report, action)
}

async function confirmAction(): Promise<void> {
  if (!actionTarget.value || !confirmationAction.value) return
  await executeAction(actionTarget.value, confirmationAction.value)
}

async function executeAction(report: AdminReport, action: ReportAction): Promise<void> {
  if (activeAction.value) return
  activeAction.value = { id: report.id, action }
  queueActionError.value = ''
  dialogError.value = ''
  try {
    await $fetch<ModerateReportResponse>(`/api/admin/reports/${encodeURIComponent(report.id)}`, {
      method: 'PATCH',
      body: { action },
    })
    confirmationOpen.value = false
    actionTarget.value = null
    confirmationAction.value = null
    showSnackbar(actionMessages.value[action])
    await refresh()
  }
  catch (error) {
    const statusCode = (error as { status?: number }).status
    const message = statusCode === 401
      ? t('admin.errorSession')
      : statusCode === 403
        ? t('admin.errorForbidden')
        : statusCode === 404
          ? t('admin.errorNotFound')
          : statusCode === 409
            ? t('admin.errorConflict')
            : t('admin.errorGeneric')
    if (action === 'hide' || action === 'restore') dialogError.value = message
    else queueActionError.value = message
  }
  finally {
    activeAction.value = null
  }
}

function queryWithCursor(value?: string): Record<string, string> {
  return {
    ...(status.value === 'pending' ? {} : { status: status.value }),
    ...(value ? { cursor: value } : {}),
  }
}
</script>

<template>
  <div class="admin-reports-page">
    <div v-if="!ready || (loggedIn && pending && !data)" class="admin-loading" :aria-label="t('admin.loading')">
      <div class="admin-loading__heading skeleton" />
      <div class="admin-loading__tabs skeleton" />
      <div v-for="index in 3" :key="index" class="admin-loading__card skeleton" />
    </div>

    <AppEmptyState
      v-else-if="!loggedIn"
      icon="material-symbols:admin-panel-settings-outline"
      :title="t('admin.loginTitle')"
      :description="t('admin.loginDescription')"
    >
      <a :href="loginUrl()" class="button"><Icon name="material-symbols:login" size="20" /> {{ t('admin.continueWithGithub') }}</a>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="error && !data && error.statusCode === 403"
      icon="material-symbols:gpp-bad-outline"
      :title="t('admin.noPermissionTitle')"
      :description="t('admin.noPermissionDescription')"
    >
      <NuxtLink to="/themes" class="button button--tonal">{{ t('admin.backToCatalog') }}</NuxtLink>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="error && !data"
      icon="material-symbols:cloud-off"
      :title="t('admin.loadErrorTitle')"
      :description="t('admin.loadErrorDescription')"
    >
      <button type="button" class="button button--tonal" @click="refresh()">{{ t('common.retry') }}</button>
    </AppEmptyState>

    <template v-else-if="data">
      <header class="admin-header">
        <div>
          <p class="eyebrow">{{ t('admin.eyebrow') }}</p>
          <h1>{{ t('admin.title') }}</h1>
          <p>{{ t('admin.description') }}</p>
        </div>
        <span class="admin-header__badge"><Icon name="material-symbols:shield-person-outline" size="23" /> {{ t('admin.badge') }}</span>
      </header>

      <nav class="report-tabs" :aria-label="t('admin.tabsAria')">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.value"
          :to="{ query: tab.value === 'pending' ? {} : { status: tab.value } }"
          :class="{ 'is-active': status === tab.value }"
          :aria-current="status === tab.value ? 'page' : undefined"
        >
          <Icon :name="tab.icon" size="20" /> {{ tab.label }}
        </NuxtLink>
      </nav>

      <p v-if="queueActionError" class="queue-error" role="alert">
      {{ queueActionError }} <button type="button" @click="refresh()">{{ t('admin.refreshQueue') }}</button>
      </p>
      <p v-else-if="error" class="queue-error" role="alert">
        {{ t('admin.refreshFailed') }}<button type="button" @click="refresh()">{{ t('common.retry') }}</button>
      </p>

      <div v-if="pending" class="report-list" :aria-label="t('admin.refreshing')">
        <div v-for="index in 3" :key="index" class="admin-loading__card skeleton" />
      </div>
      <AppEmptyState
        v-else-if="!data.items.length"
        :icon="status === 'pending' ? 'material-symbols:task-alt' : 'material-symbols:inbox-outline'"
        :title="status === 'pending' ? t('admin.emptyPendingTitle') : t('admin.emptyOtherTitle', { status: statusLabels[status] })"
        :description="status === 'pending' ? t('admin.emptyPendingDescription') : t('admin.emptyOtherDescription')"
      />

      <div v-else class="report-list">
        <article v-for="report in data.items" :key="report.id" class="report-card card">
          <header class="report-card__header">
            <div class="report-card__title">
              <span><Icon :name="report.targetType === 'theme' ? 'material-symbols:palette-outline' : 'material-symbols:forum-outline'" size="22" /></span>
              <div>
                <h2>{{ report.targetType === 'theme' ? t('admin.themeReport') : t('admin.commentReport') }}</h2>
                <time :datetime="report.createdAt">{{ formatDate(report.createdAt) }}</time>
              </div>
            </div>
            <div class="report-card__chips">
              <span class="chip" :class="{ 'chip--selected': report.status === 'resolved' }">{{ statusLabels[report.status] }}</span>
              <span class="chip target-status" :class="{ 'is-hidden': targetStatus(report) === 'hidden', 'is-deleted': targetStatus(report) === 'deleted' }">
                {{ targetStatusLabel(report) }}
              </span>
            </div>
          </header>

          <div class="report-context">
            <div class="report-theme">
              <span class="report-context__label">{{ report.targetType === 'theme' ? t('admin.reportedTheme') : t('admin.parentTheme') }}</span>
              <NuxtLink v-if="report.theme.status === 'published'" :to="`/themes/${encodeURIComponent(report.theme.id)}`">
                <strong>{{ report.theme.name }}</strong>
                <Icon name="material-symbols:arrow-outward" size="17" />
              </NuxtLink>
              <strong v-else>{{ report.theme.name }}</strong>
              <code>{{ report.theme.id }}</code>
              <small>{{ t('admin.creator', { name: report.theme.owner.displayName || report.theme.owner.login, login: report.theme.owner.login }) }}</small>
            </div>
            <div v-if="report.comment" class="report-comment">
              <div>
                <span class="report-context__label">{{ t('admin.reportedComment') }}</span>
                <small>{{ report.comment.author.displayName || report.comment.author.login }} (@{{ report.comment.author.login }}) · {{ formatDate(report.comment.createdAt) }}</small>
              </div>
              <p>{{ report.comment.body }}</p>
              <span class="moderator-only"><Icon name="material-symbols:lock-outline" size="14" /> {{ t('admin.moderatorOnly') }}</span>
            </div>
          </div>

          <dl class="report-facts">
            <div><dt>{{ t('admin.reason') }}</dt><dd>{{ reasonLabels[report.reason] }}</dd></div>
            <div>
              <dt>{{ t('admin.reporter') }}</dt>
              <dd><NuxtLink :to="`/users/${encodeURIComponent(report.reporter.login)}`">{{ report.reporter.displayName || report.reporter.login }} (@{{ report.reporter.login }})</NuxtLink></dd>
            </div>
            <div><dt>{{ t('admin.reportId') }}</dt><dd><code>{{ report.id }}</code></dd></div>
          </dl>

          <div v-if="report.details" class="report-details-block">
            <strong>{{ t('admin.details') }}</strong>
            <p>{{ report.details }}</p>
          </div>

          <div v-if="report.handledBy || report.handledAt" class="report-audit">
            <Icon name="material-symbols:manage-history" size="19" />
            <span>
              <template v-if="report.handledBy">{{ t('admin.handledBy', { name: report.handledBy.displayName || report.handledBy.login }) }}</template>
              <template v-if="report.handledAt"> · {{ formatDate(report.handledAt) }}</template>
            </span>
          </div>

          <footer v-if="report.status === 'pending' || canRestore(report)" class="report-actions">
            <template v-if="report.status === 'pending'">
              <button type="button" class="button button--tonal button--small" :disabled="isActive(report)" @click="requestAction(report, 'resolve')">
                <Icon name="material-symbols:check" size="18" />
                {{ activeAction?.action === 'resolve' && isActive(report) ? t('admin.handling') : t('admin.markResolved') }}
              </button>
              <button type="button" class="button button--outlined button--small" :disabled="isActive(report)" @click="requestAction(report, 'dismiss')">
                <Icon name="material-symbols:block" size="18" /> {{ t('admin.dismiss') }}
              </button>
              <button v-if="canHide(report)" type="button" class="button button--danger button--small" :disabled="isActive(report)" @click="requestAction(report, 'hide')">
                <Icon name="material-symbols:visibility-off-outline" size="18" /> {{ t('admin.hideTarget', { target: report.targetType === 'theme' ? t('report.theme') : t('report.comment') }) }}
              </button>
            </template>
            <button v-if="canRestore(report)" type="button" class="button button--tonal button--small" :disabled="isActive(report)" @click="requestAction(report, 'restore')">
              <Icon name="material-symbols:visibility-outline" size="18" /> {{ t('admin.restorePublic') }}
            </button>
          </footer>
        </article>
      </div>

      <nav v-if="cursor || data.nextCursor" class="report-pagination" :aria-label="t('admin.pagination')">
        <button v-if="cursor" type="button" class="button button--outlined" @click="$router.back()">
          <Icon name="material-symbols:arrow-back" size="19" /> {{ t('common.previous') }}
        </button>
        <NuxtLink v-if="data.nextCursor" :to="{ query: queryWithCursor(data.nextCursor) }" class="button button--tonal">
          {{ t('common.next') }} <Icon name="material-symbols:arrow-forward" size="19" />
        </NuxtLink>
      </nav>

      <AppDialog
        v-model:open="confirmationOpen"
        :title="confirmationTitle"
        :description="confirmationDescription"
      >
        <p v-if="actionTarget" class="confirmation-target">
          {{ actionTarget.targetType === 'theme' ? actionTarget.theme.name : actionTarget.comment?.body }}
        </p>
        <p v-if="dialogError" class="dialog-error" role="alert">{{ dialogError }}</p>
        <template #actions>
          <button type="button" class="button button--text" :disabled="activeAction !== null" @click="confirmationOpen = false">{{ t('common.cancel') }}</button>
          <button
            type="button"
            class="button"
            :class="{ 'button--danger': confirmationAction === 'hide' }"
            :disabled="activeAction !== null"
            @click="confirmAction"
          >
            <Icon :name="confirmationAction === 'hide' ? 'material-symbols:visibility-off-outline' : 'material-symbols:visibility-outline'" size="18" />
            {{ activeAction ? t('admin.submitting') : confirmationAction === 'hide' ? t('admin.confirmHide') : t('admin.confirmRestore') }}
          </button>
        </template>
      </AppDialog>
    </template>
  </div>
</template>

<style scoped>
.admin-header {
  display: flex;
  margin: 8px 0 30px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.admin-header h1 {
  margin-bottom: 10px;
  font-size: clamp(34px, 5vw, 48px);
  letter-spacing: -0.035em;
}

.admin-header > div > p:last-child {
  margin: 0;
  color: var(--md-on-surface-variant);
  font-size: 15px;
  line-height: 1.7;
}

.admin-header__badge {
  display: inline-flex;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 999px;
  align-items: center;
  background: var(--md-primary-container);
  color: var(--md-on-primary-container);
  font-size: 13px;
  font-weight: 650;
  flex: 0 0 auto;
  gap: 8px;
}

.report-tabs {
  display: flex;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--md-outline-variant);
  gap: 8px;
}

.report-tabs a {
  position: relative;
  display: inline-flex;
  min-height: 52px;
  padding: 10px 22px;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 14px;
  font-weight: 600;
  gap: 8px;
  text-decoration: none;
}

.report-tabs a::after {
  position: absolute;
  right: 16px;
  bottom: 0;
  left: 16px;
  height: 3px;
  border-radius: 3px 3px 0 0;
  background: var(--md-primary);
  content: '';
  opacity: 0;
}

.report-tabs a.is-active {
  color: var(--md-primary);
}

.report-tabs a.is-active::after {
  opacity: 1;
}

.queue-error {
  display: flex;
  margin: 0 0 20px;
  padding: 13px 16px;
  border-radius: var(--md-radius-medium);
  align-items: center;
  justify-content: space-between;
  background: var(--md-error-container);
  color: var(--md-on-error-container);
  font-size: 13px;
  gap: 16px;
}

.queue-error button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 650;
  cursor: pointer;
  text-decoration: underline;
}

.report-list {
  display: grid;
  gap: 20px;
}

.report-card {
  min-width: 0;
  padding: 24px;
  border: 1px solid var(--md-outline-variant);
  background: var(--md-surface-container-lowest);
}

.report-card__header {
  display: flex;
  margin-bottom: 20px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.report-card__title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.report-card__title > span {
  display: inline-flex;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  align-items: center;
  justify-content: center;
  background: var(--md-secondary-container);
  color: var(--md-on-secondary-container);
  flex: 0 0 auto;
}

.report-card__title h2 {
  margin: 0;
  font-size: 18px;
}

.report-card__title time {
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.report-card__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}

.target-status.is-hidden {
  background: var(--md-tertiary-container);
  color: var(--md-on-tertiary-container);
}

.target-status.is-deleted {
  background: var(--md-error-container);
  color: var(--md-on-error-container);
}

.report-context {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  background: var(--md-surface-container-low);
}

.report-theme {
  display: flex;
  min-width: 0;
  padding: 18px;
  flex-direction: column;
  align-items: flex-start;
}

.report-context__label {
  margin-bottom: 7px;
  color: var(--md-on-surface-variant);
  font-size: 11px;
  font-weight: 650;
}

.report-theme > a {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  color: var(--md-primary);
  gap: 5px;
  text-decoration: none;
}

.report-theme strong {
  overflow-wrap: anywhere;
  font-size: 17px;
}

.report-theme code {
  margin-top: 4px;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.report-theme small,
.report-comment small {
  margin-top: 8px;
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.report-comment {
  padding: 18px;
  border-top: 1px solid var(--md-outline-variant);
  background: var(--md-surface-container-lowest);
}

.report-comment > div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
}

.report-comment p {
  margin: 12px 0;
  font-size: 14px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.moderator-only {
  display: inline-flex;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 10px;
  gap: 4px;
}

.report-facts {
  display: grid;
  margin: 18px 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.report-facts > div {
  min-width: 0;
}

.report-facts dt {
  margin-bottom: 5px;
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.report-facts dd {
  margin: 0;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.report-facts a {
  color: var(--md-on-surface);
  text-decoration: none;
}

.report-facts a:hover {
  color: var(--md-primary);
  text-decoration: underline;
}

.report-facts code {
  font-size: 11px;
}

.report-details-block {
  padding: 14px 16px;
  border-left: 3px solid var(--md-primary);
  border-radius: 0 var(--md-radius-medium) var(--md-radius-medium) 0;
  background: var(--md-surface-container-low);
}

.report-details-block strong {
  font-size: 12px;
}

.report-details-block p {
  margin: 6px 0 0;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.report-audit {
  display: flex;
  margin-top: 18px;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 12px;
  gap: 7px;
}

.report-actions {
  display: flex;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--md-outline-variant);
  flex-wrap: wrap;
  gap: 10px;
}

.report-pagination {
  display: flex;
  margin-top: 32px;
  justify-content: center;
  gap: 12px;
}

.confirmation-target {
  max-height: 160px;
  margin: 0;
  overflow: auto;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.dialog-error {
  margin: 12px 0 0;
  color: var(--md-error);
  font-size: 13px;
}

.admin-loading {
  display: grid;
  gap: 20px;
}

.admin-loading__heading {
  height: 100px;
  border-radius: var(--md-radius-large);
}

.admin-loading__tabs {
  height: 52px;
  border-radius: var(--md-radius-medium);
}

.admin-loading__card {
  height: 260px;
  border-radius: var(--md-radius-large);
}

@media (max-width: 640px) {
  .admin-header {
    flex-direction: column;
    gap: 16px;
  }

  .report-tabs {
    overflow-x: auto;
  }

  .report-tabs a {
    padding: 10px 14px;
    flex: 1 0 auto;
    justify-content: center;
  }

  .report-card {
    padding: 18px;
  }

  .report-card__header {
    flex-direction: column;
  }

  .report-card__chips {
    justify-content: flex-start;
  }

  .report-facts {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .report-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .report-actions .button {
    width: 100%;
  }

  .queue-error {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
