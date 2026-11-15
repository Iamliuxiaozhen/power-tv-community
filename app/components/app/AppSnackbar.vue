<script setup lang="ts">
const { t } = useI18n()
const { snackbar, dismissSnackbar } = useSnackbar()
let timeout: ReturnType<typeof setTimeout> | undefined

watch(() => snackbar.value?.id, (id) => {
  if (timeout) clearTimeout(timeout)
  if (id) timeout = setTimeout(dismissSnackbar, 4500)
})

onBeforeUnmount(() => {
  if (timeout) clearTimeout(timeout)
})
</script>

<template>
  <Transition name="snackbar">
    <div v-if="snackbar" :key="snackbar.id" class="snackbar" role="status" aria-live="polite">
      <span>{{ snackbar.message }}</span>
      <button type="button" class="icon-button" :aria-label="t('common.closeNotification')" @click="dismissSnackbar">
        <Icon name="material-symbols:close" size="20" />
      </button>
    </div>
  </Transition>
</template>
