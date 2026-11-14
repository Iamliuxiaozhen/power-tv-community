<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string, description?: string }>()
const dialog = useTemplateRef('dialog')
const titleId = useId()

watch(open, async (value) => {
  await nextTick()
  if (value && !dialog.value?.open) dialog.value?.showModal()
  if (!value && dialog.value?.open) dialog.value.close()
}, { flush: 'post' })

onMounted(() => {
  if (open.value) dialog.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    :aria-labelledby="titleId"
    :aria-describedby="description ? `${titleId}-description` : undefined"
    @cancel.prevent="open = false"
    @close="open = false"
    @click.self="open = false"
  >
    <div class="dialog__content">
      <div class="dialog__heading">
        <div>
          <h2 :id="titleId">{{ title }}</h2>
          <p v-if="description" :id="`${titleId}-description`">{{ description }}</p>
        </div>
        <button type="button" class="icon-button" aria-label="关闭对话框" @click="open = false">
          <Icon name="material-symbols:close" size="22" />
        </button>
      </div>
      <div class="dialog__body">
        <slot />
      </div>
      <div v-if="$slots.actions" class="dialog__actions">
        <slot name="actions" />
      </div>
    </div>
  </dialog>
</template>
