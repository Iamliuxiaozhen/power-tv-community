<script setup lang="ts">
import type { CommentListResponse, CommunityComment } from '#shared/community'

const { t } = useI18n()
const { formatDate } = useFormatters()
const props = defineProps<{ themeId: string }>()
const { loggedIn, loginUrl, user } = useAuth()
const { showSnackbar } = useSnackbar()
const comments = ref<CommunityComment[]>([])
const nextCursor = ref<string | null>(null)
const { data, pending, error, refresh } = await useAsyncData<CommentListResponse>(
  `theme-comments-${props.themeId}`,
  () => $fetch<CommentListResponse>(`/api/themes/${encodeURIComponent(props.themeId)}/comments`, { query: { limit: 20 } }),
  { watch: [() => props.themeId] },
)
watch(data, (value) => {
  comments.value = value?.items ?? []
  nextCursor.value = value?.nextCursor ?? null
}, { immediate: true })

const commentBody = ref('')
const submitting = ref(false)
const submitError = ref('')
const canSubmit = computed(() => Boolean(commentBody.value.trim()) && commentBody.value.length <= 2000 && !submitting.value)
const loadingMore = ref(false)
const loadMoreError = ref('')

async function submitComment(): Promise<void> {
  if (!canSubmit.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const comment = await $fetch<CommunityComment>(`/api/themes/${encodeURIComponent(props.themeId)}/comments`, {
      method: 'POST',
      body: { body: commentBody.value },
    })
    comments.value = [comment, ...comments.value]
    commentBody.value = ''
    showSnackbar(t('comments.published'))
  }
  catch (error) {
    const status = (error as { status?: number }).status
    submitError.value = status === 401
      ? t('comments.submitErrorSession')
      : status === 429
        ? t('comments.submitErrorRate')
        : t('comments.submitErrorGeneric')
  }
  finally {
    submitting.value = false
  }
}

async function loadMore(): Promise<void> {
  if (!nextCursor.value || loadingMore.value) return
  loadingMore.value = true
  loadMoreError.value = ''
  try {
    const page = await $fetch<CommentListResponse>(`/api/themes/${encodeURIComponent(props.themeId)}/comments`, {
      query: { cursor: nextCursor.value, limit: 20 },
    })
    const existing = new Set(comments.value.map(comment => comment.id))
    comments.value.push(...page.items.filter(comment => !existing.has(comment.id)))
    nextCursor.value = page.nextCursor
  }
  catch {
    loadMoreError.value = t('comments.loadMoreError')
  }
  finally {
    loadingMore.value = false
  }
}

const deleteOpen = ref(false)
const deleteTarget = ref<string | null>(null)
const deleting = ref(false)
const deleteError = ref('')

function confirmDelete(id: string): void {
  deleteTarget.value = id
  deleteError.value = ''
  deleteOpen.value = true
}

async function deleteComment(): Promise<void> {
  if (!deleteTarget.value || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/comments/${encodeURIComponent(deleteTarget.value)}`, { method: 'DELETE' })
    comments.value = comments.value.map(comment => comment.id === deleteTarget.value
      ? { ...comment, body: null, status: 'deleted' }
      : comment)
    deleteOpen.value = false
    deleteTarget.value = null
    showSnackbar(t('comments.deleted'))
  }
  catch {
    deleteError.value = t('comments.deleteError')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="comments-section" aria-labelledby="comments-heading">
    <div class="section-heading">
      <div>
        <h2 id="comments-heading">{{ t('comments.title') }}</h2>
        <p>{{ t('comments.description') }}</p>
      </div>
      <span v-if="comments.length" class="chip">{{ t('comments.loadedCount', { count: comments.length }) }}</span>
    </div>

    <form v-if="loggedIn && user" class="comment-composer card" @submit.prevent="submitComment">
      <img :src="user.avatarUrl" alt="" width="42" height="42">
      <div class="comment-composer__main">
        <label for="new-comment" class="visually-hidden">{{ t('comments.composerLabel') }}</label>
        <textarea
          id="new-comment"
          v-model="commentBody"
          maxlength="2000"
          rows="4"
          :placeholder="t('comments.placeholder')"
          :disabled="submitting"
          @input="submitError = ''"
        />
        <p v-if="submitError" class="comment-composer__error" role="alert">{{ submitError }}</p>
        <div class="comment-composer__footer">
          <span :class="{ 'is-limit': commentBody.length >= 2000 }">{{ commentBody.length }} / 2000</span>
          <button type="submit" class="button button--small" :disabled="!canSubmit">
            <Icon name="material-symbols:send-outline" size="18" /> {{ submitting ? t('comments.publishing') : t('comments.submit') }}
          </button>
        </div>
      </div>
    </form>
    <div v-else class="comment-login">
      <span><Icon name="material-symbols:forum-outline" size="23" /> {{ t('comments.loginPrompt') }}</span>
      <a :href="loginUrl()" class="button button--tonal button--small"><Icon name="material-symbols:login" size="18" /> {{ t('comments.login') }}</a>
    </div>

    <div v-if="pending && !comments.length" class="comment-list" :aria-label="t('comments.loading')">
      <div v-for="index in 3" :key="index" class="comment-skeleton skeleton" />
    </div>
    <AppEmptyState
      v-else-if="error && !comments.length"
      icon="material-symbols:cloud-off"
      :title="t('comments.loadErrorTitle')"
      :description="t('comments.loadErrorDescription')"
    >
      <button type="button" class="button button--tonal" @click="refresh()">{{ t('common.retry') }}</button>
    </AppEmptyState>
    <div v-else-if="!comments.length" class="comments-empty">
      <Icon name="material-symbols:forum-outline" size="30" />
      <div><strong>{{ t('comments.emptyTitle') }}</strong><p>{{ t('comments.emptyDescription') }}</p></div>
    </div>

    <div v-else class="comment-list">
      <article v-for="comment in comments" :key="comment.id" class="comment" :class="{ 'is-muted': comment.status !== 'visible' }">
        <NuxtLink :to="`/users/${encodeURIComponent(comment.author.login)}`" class="comment__author">
          <img :src="comment.author.avatarUrl" alt="" width="42" height="42" loading="lazy">
        </NuxtLink>
        <div class="comment__content">
          <header>
            <div>
              <NuxtLink :to="`/users/${encodeURIComponent(comment.author.login)}`">
                {{ comment.author.displayName || comment.author.login }}
              </NuxtLink>
              <span>@{{ comment.author.login }}</span>
            </div>
            <div class="comment__meta">
              <time :datetime="comment.createdAt">{{ formatDate(comment.createdAt) }}</time>
              <ModerationReportButton
                v-if="comment.status === 'visible'"
                target-type="comment"
                :target-id="comment.id"
                icon-only
              />
              <button
                v-if="comment.status === 'visible' && user?.githubId === comment.author.githubId"
                type="button"
                class="icon-button"
                :aria-label="t('comments.deleteAria')"
                :title="t('comments.deleteAria')"
                @click="confirmDelete(comment.id)"
              >
                <Icon name="material-symbols:delete-outline" size="19" />
              </button>
            </div>
          </header>
          <p v-if="comment.status === 'visible'" class="comment__body">{{ comment.body }}</p>
          <p v-else class="comment__placeholder">
            <Icon :name="comment.status === 'hidden' ? 'material-symbols:visibility-off-outline' : 'material-symbols:delete-outline'" size="17" />
            {{ comment.status === 'hidden' ? t('comments.hiddenByModerator') : t('comments.deletedByAuthor') }}
          </p>
        </div>
      </article>
    </div>

    <div v-if="nextCursor || loadMoreError" class="comments-more">
      <p v-if="loadMoreError" role="alert">{{ loadMoreError }}</p>
      <button v-if="nextCursor" type="button" class="button button--outlined" :disabled="loadingMore" @click="loadMore">
        <Icon name="material-symbols:expand-more" size="20" /> {{ loadingMore ? t('comments.loadingMore') : t('comments.loadMore') }}
      </button>
    </div>

    <AppDialog v-model:open="deleteOpen" :title="t('comments.deleteDialogTitle')" :description="t('comments.deleteDialogDescription')">
      <p class="comment-delete-copy">{{ t('comments.deleteDialogBody') }}</p>
      <p v-if="deleteError" class="comment-composer__error" role="alert">{{ deleteError }}</p>
      <template #actions>
        <button type="button" class="button button--text" :disabled="deleting" @click="deleteOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="button button--danger" :disabled="deleting" @click="deleteComment">
          <Icon name="material-symbols:delete-outline" size="18" /> {{ deleting ? t('comments.deleting') : t('comments.confirmDelete') }}
        </button>
      </template>
    </AppDialog>
  </section>
</template>

<style scoped>
.comments-section {
  margin-top: 48px;
}

.comments-section .section-heading h2 {
  font-size: 28px;
}

.comment-composer {
  display: flex;
  margin-bottom: 24px;
  padding: 20px;
  border: 1px solid var(--md-outline-variant);
  background: var(--md-surface-container-lowest);
  gap: 14px;
}

.comment-composer > img,
.comment__author img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
}

.comment-composer__main {
  min-width: 0;
  flex: 1;
}

.comment-composer textarea {
  width: 100%;
  min-height: 104px;
  padding: 13px 15px;
  border: 1px solid var(--md-outline);
  border-radius: var(--md-radius-medium);
  outline: 0;
  background: var(--md-surface);
  resize: vertical;
}

.comment-composer textarea:focus {
  border-color: var(--md-primary);
  box-shadow: 0 0 0 2px var(--md-primary);
}

.comment-composer__footer {
  display: flex;
  margin-top: 10px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.comment-composer__footer > span {
  color: var(--md-on-surface-variant);
  font-size: 11px;
}

.comment-composer__footer > span.is-limit,
.comment-composer__error {
  color: var(--md-error);
}

.comment-composer__error {
  margin: 8px 0 0;
  font-size: 13px;
}

.comment-login {
  display: flex;
  margin-bottom: 24px;
  padding: 16px 18px;
  border-radius: var(--md-radius-large);
  align-items: center;
  justify-content: space-between;
  background: var(--md-surface-container-low);
  gap: 16px;
}

.comment-login > span {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 550;
  gap: 9px;
}

.comment-list {
  display: grid;
  gap: 0;
}

.comment {
  display: flex;
  padding: 24px 0;
  border-bottom: 1px solid var(--md-outline-variant);
  gap: 14px;
}

.comment:first-child {
  padding-top: 8px;
}

.comment__author {
  flex: 0 0 auto;
}

.comment__content {
  min-width: 0;
  flex: 1;
}

.comment__content > header {
  display: flex;
  margin-bottom: 10px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.comment__content > header > div:first-child {
  display: flex;
  min-width: 0;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.comment__content > header a {
  color: var(--md-on-surface);
  font-size: 14px;
  font-weight: 650;
  text-decoration: none;
}

.comment__content > header a:hover {
  color: var(--md-primary);
}

.comment__content > header span,
.comment__meta time {
  color: var(--md-on-surface-variant);
  font-size: 12px;
}

.comment__meta {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 4px;
}

.comment__meta .icon-button {
  width: 34px;
  height: 34px;
}

.comment__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.comment__placeholder {
  display: flex;
  margin: 0;
  align-items: center;
  color: var(--md-on-surface-variant);
  font-size: 13px;
  font-style: italic;
  gap: 6px;
}

.comment.is-muted {
  opacity: 0.75;
}

.comments-empty {
  display: flex;
  min-height: 130px;
  padding: 28px;
  border: 1px dashed var(--md-outline-variant);
  border-radius: var(--md-radius-large);
  align-items: center;
  justify-content: center;
  color: var(--md-on-surface-variant);
  gap: 14px;
}

.comments-empty strong {
  color: var(--md-on-surface);
  font-size: 15px;
}

.comments-empty p {
  margin: 3px 0 0;
  font-size: 13px;
}

.comments-more {
  display: flex;
  margin-top: 24px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
}

.comments-more p {
  margin: 0;
  color: var(--md-error);
  font-size: 13px;
}

.comment-skeleton {
  height: 120px;
  margin-bottom: 14px;
  border-radius: var(--md-radius-large);
}

.comment-delete-copy {
  margin-bottom: 0;
  color: var(--md-on-surface-variant);
  font-size: 14px;
  line-height: 1.7;
}

@media (max-width: 560px) {
  .comment-composer {
    padding: 16px;
  }

  .comment-composer > img,
  .comment__author img {
    width: 36px;
    height: 36px;
  }

  .comment-login {
    align-items: flex-start;
    flex-direction: column;
  }

  .comment__content > header {
    gap: 8px;
  }

  .comment__content > header > div:first-child {
    align-items: flex-start;
    flex-direction: column;
    gap: 1px;
  }

  .comment__meta time {
    display: none;
  }
}
</style>
