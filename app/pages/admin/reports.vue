<script setup lang="ts">
import type {
  AdminReport,
  AdminReportListResponse,
  ModerateReportResponse,
  ReportAction,
  ReportReason,
  ReportStatus,
} from '#shared/community'

const route = useRoute()
const { loggedIn, loginUrl, ready } = useAuth()
const { showSnackbar } = useSnackbar()
const status = computed<ReportStatus>(() => {
  const value = route.query.status
  return value === 'resolved' || value === 'dismissed' ? value : 'pending'
})
const cursor = computed(() => typeof route.query.cursor === 'string' ? route.query.cursor : undefined)
const { data, pending, error, refresh } = await useAsyncData<AdminReportListResponse | null>(
  'admin-report-queue',
  () => loggedIn.value
    ? $fetch<AdminReportListResponse>('/api/admin/reports', {
        query: { status: status.value, cursor: cursor.value, limit: 20 },
      })
    : Promise.resolve(null),
  { watch: [status, cursor, loggedIn] },
)

const tabs: { value: ReportStatus, label: string, icon: string }[] = [
  { value: 'pending', label: '待处理', icon: 'material-symbols:pending-actions' },
  { value: 'resolved', label: '已处理', icon: 'material-symbols:check-circle-outline' },
  { value: 'dismissed', label: '已驳回', icon: 'material-symbols:do-not-disturb-on-outline' },
]
const reasonLabels: Record<ReportReason, string> = {
  spam: '垃圾信息',
  malware: '恶意内容',
  copyright: '侵犯版权',
  other: '其他问题',
}
const statusLabels: Record<ReportStatus, string> = {
  pending: '待处理',
  resolved: '已处理',
  dismissed: '已驳回',
}
const actionMessages: Record<ReportAction, string> = {
  resolve: '举报已标记为处理完成。',
  dismiss: '举报已驳回。',
  hide: '内容已隐藏，相关待处理举报已解决。',
  restore: '内容已恢复公开展示。',
}

const activeAction = ref<{ id: string, action: ReportAction } | null>(null)
const queueActionError = ref('')
const actionTarget = ref<AdminReport | null>(null)
const confirmationAction = ref<'hide' | 'restore' | null>(null)
const confirmationOpen = ref(false)
const dialogError = ref('')
const confirmationTitle = computed(() => {
  if (!actionTarget.value || !confirmationAction.value) return ''
  const target = actionTarget.value.targetType === 'theme' ? '主题' : '评论'
  return confirmationAction.value === 'hide' ? `隐藏这个${target}？` : `恢复这个${target}？`
})
const confirmationDescription = computed(() => {
  if (!actionTarget.value || !confirmationAction.value) return ''
  if (confirmationAction.value === 'restore') return '恢复后，内容会重新出现在公开社区中。'
  return actionTarget.value.targetType === 'theme'
    ? '隐藏后，主题详情和所有版本下载将不可公开访问，相关待处理举报会标记为已处理。'
    : '隐藏后，公开讨论只显示隐藏占位，相关待处理举报会标记为已处理。'
})

useHead({ title: '举报管理' })

function targetStatus(report: AdminReport): string {
  return report.comment?.status ?? report.theme.status
}

function targetStatusLabel(report: AdminReport): string {
  const value = targetStatus(report)
  const labels: Record<string, string> = {
    published: '公开',
    visible: '可见',
    hidden: '已隐藏',
    deleted: '已删除',
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
    showSnackbar(actionMessages[action])
    await refresh()
  }
  catch (error) {
    const statusCode = (error as { status?: number }).status
    const message = statusCode === 401
      ? '登录已过期，请重新登录。'
      : statusCode === 403
        ? '当前账号没有管理员权限。'
        : statusCode === 404
          ? '举报或目标内容不存在，请刷新队列。'
          : statusCode === 409
            ? '内容或举报状态已变化，请刷新队列后重试。'
            : '操作失败，请检查网络连接后重试。'
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
    <div v-if="!ready || (loggedIn && pending && !data)" class="admin-loading" aria-label="正在加载举报队列">
      <div class="admin-loading__heading skeleton" />
      <div class="admin-loading__tabs skeleton" />
      <div v-for="index in 3" :key="index" class="admin-loading__card skeleton" />
    </div>

    <AppEmptyState
      v-else-if="!loggedIn"
      icon="material-symbols:admin-panel-settings-outline"
      title="登录后进入举报管理"
      description="只有配置了管理员权限的 GitHub 账号可以处理社区举报。"
    >
      <a :href="loginUrl()" class="button"><Icon name="material-symbols:login" size="20" /> 使用 GitHub 继续</a>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="error && !data && error.statusCode === 403"
      icon="material-symbols:gpp-bad-outline"
      title="没有管理员权限"
      description="当前 GitHub 账号不在管理员列表中。你仍可浏览主题和参与社区讨论。"
    >
      <NuxtLink to="/themes" class="button button--tonal">返回主题目录</NuxtLink>
    </AppEmptyState>

    <AppEmptyState
      v-else-if="error && !data"
      icon="material-symbols:cloud-off"
      title="举报队列加载失败"
      description="暂时无法读取举报内容，请稍后重试。"
    >
      <button type="button" class="button button--tonal" @click="refresh()">重试</button>
    </AppEmptyState>

    <template v-else-if="data">
      <header class="admin-header">
        <div>
          <p class="eyebrow">COMMUNITY MODERATION</p>
          <h1>举报管理</h1>
          <p>核实社区反馈，处理违规内容，并保留清晰的处理记录。</p>
        </div>
        <span class="admin-header__badge"><Icon name="material-symbols:shield-person-outline" size="23" /> 管理员</span>
      </header>

      <nav class="report-tabs" aria-label="举报状态">
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
      {{ queueActionError }} <button type="button" @click="refresh()">刷新队列</button>
      </p>
      <p v-else-if="error" class="queue-error" role="alert">
        队列刷新失败，当前显示上次加载的内容。<button type="button" @click="refresh()">重试</button>
      </p>

      <div v-if="pending" class="report-list" aria-label="正在刷新举报队列">
        <div v-for="index in 3" :key="index" class="admin-loading__card skeleton" />
      </div>
      <AppEmptyState
        v-else-if="!data.items.length"
        :icon="status === 'pending' ? 'material-symbols:task-alt' : 'material-symbols:inbox-outline'"
        :title="status === 'pending' ? '没有待处理举报' : `没有${statusLabels[status]}举报`"
        :description="status === 'pending' ? '社区目前没有需要你处理的举报。' : '切换其他标签可查看不同状态的记录。'"
      />

      <div v-else class="report-list">
        <article v-for="report in data.items" :key="report.id" class="report-card card">
          <header class="report-card__header">
            <div class="report-card__title">
              <span><Icon :name="report.targetType === 'theme' ? 'material-symbols:palette-outline' : 'material-symbols:forum-outline'" size="22" /></span>
              <div>
                <h2>{{ report.targetType === 'theme' ? '主题举报' : '评论举报' }}</h2>
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
              <span class="report-context__label">{{ report.targetType === 'theme' ? '被举报主题' : '所属主题' }}</span>
              <NuxtLink v-if="report.theme.status === 'published'" :to="`/themes/${encodeURIComponent(report.theme.id)}`">
                <strong>{{ report.theme.name }}</strong>
                <Icon name="material-symbols:arrow-outward" size="17" />
              </NuxtLink>
              <strong v-else>{{ report.theme.name }}</strong>
              <code>{{ report.theme.id }}</code>
              <small>创作者：{{ report.theme.owner.displayName || report.theme.owner.login }} (@{{ report.theme.owner.login }})</small>
            </div>
            <div v-if="report.comment" class="report-comment">
              <div>
                <span class="report-context__label">被举报评论</span>
                <small>{{ report.comment.author.displayName || report.comment.author.login }} (@{{ report.comment.author.login }}) · {{ formatDate(report.comment.createdAt) }}</small>
              </div>
              <p>{{ report.comment.body }}</p>
              <span class="moderator-only"><Icon name="material-symbols:lock-outline" size="14" /> 原始正文仅管理员可见</span>
            </div>
          </div>

          <dl class="report-facts">
            <div><dt>举报原因</dt><dd>{{ reasonLabels[report.reason] }}</dd></div>
            <div>
              <dt>举报人</dt>
              <dd><NuxtLink :to="`/users/${encodeURIComponent(report.reporter.login)}`">{{ report.reporter.displayName || report.reporter.login }} (@{{ report.reporter.login }})</NuxtLink></dd>
            </div>
            <div><dt>举报编号</dt><dd><code>{{ report.id }}</code></dd></div>
          </dl>

          <div v-if="report.details" class="report-details-block">
            <strong>补充说明</strong>
            <p>{{ report.details }}</p>
          </div>

          <div v-if="report.handledBy || report.handledAt" class="report-audit">
            <Icon name="material-symbols:manage-history" size="19" />
            <span>
              <template v-if="report.handledBy">由 {{ report.handledBy.displayName || report.handledBy.login }} 处理</template>
              <template v-if="report.handledAt"> · {{ formatDate(report.handledAt) }}</template>
            </span>
          </div>

          <footer v-if="report.status === 'pending' || canRestore(report)" class="report-actions">
            <template v-if="report.status === 'pending'">
              <button type="button" class="button button--tonal button--small" :disabled="isActive(report)" @click="requestAction(report, 'resolve')">
                <Icon name="material-symbols:check" size="18" />
                {{ activeAction?.action === 'resolve' && isActive(report) ? '正在处理…' : '标记已处理' }}
              </button>
              <button type="button" class="button button--outlined button--small" :disabled="isActive(report)" @click="requestAction(report, 'dismiss')">
                <Icon name="material-symbols:block" size="18" /> 驳回举报
              </button>
              <button v-if="canHide(report)" type="button" class="button button--danger button--small" :disabled="isActive(report)" @click="requestAction(report, 'hide')">
                <Icon name="material-symbols:visibility-off-outline" size="18" /> 隐藏{{ report.targetType === 'theme' ? '主题' : '评论' }}
              </button>
            </template>
            <button v-if="canRestore(report)" type="button" class="button button--tonal button--small" :disabled="isActive(report)" @click="requestAction(report, 'restore')">
              <Icon name="material-symbols:visibility-outline" size="18" /> 恢复公开
            </button>
          </footer>
        </article>
      </div>

      <nav v-if="cursor || data.nextCursor" class="report-pagination" aria-label="举报分页">
        <button v-if="cursor" type="button" class="button button--outlined" @click="$router.back()">
          <Icon name="material-symbols:arrow-back" size="19" /> 上一页
        </button>
        <NuxtLink v-if="data.nextCursor" :to="{ query: queryWithCursor(data.nextCursor) }" class="button button--tonal">
          下一页 <Icon name="material-symbols:arrow-forward" size="19" />
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
          <button type="button" class="button button--text" :disabled="activeAction !== null" @click="confirmationOpen = false">取消</button>
          <button
            type="button"
            class="button"
            :class="{ 'button--danger': confirmationAction === 'hide' }"
            :disabled="activeAction !== null"
            @click="confirmAction"
          >
            <Icon :name="confirmationAction === 'hide' ? 'material-symbols:visibility-off-outline' : 'material-symbols:visibility-outline'" size="18" />
            {{ activeAction ? '正在提交…' : confirmationAction === 'hide' ? '确认隐藏' : '确认恢复' }}
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
