<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AddCommentNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { TEXT_MAX_LENGTH, validateMaxLength } from '@/utils/nodeFormValidation'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import FieldMessage from '@/components/forms/FieldMessage.vue'

const props = defineProps<{ node: AddCommentNode }>()

const flowStore = useFlowStore()

const comment = ref('')

watch(
  () => props.node,
  (next) => {
    comment.value = next.data.comment
  },
  { immediate: true },
)

const commentError = computed(() => validateMaxLength(comment.value, TEXT_MAX_LENGTH, 'Comment'))

// Exposed so the panel can hold Save while the comment is too long.
const isValid = computed(() => !commentError.value)

function save() {
  flowStore.updateComment(props.node.id, comment.value.trim())
}

defineExpose({ save, isValid })
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <Label for="add-comment-text">Comment</Label>
    <Textarea
      id="add-comment-text"
      v-model="comment"
      placeholder="Optional comment text"
      :aria-invalid="Boolean(commentError) || undefined"
      :aria-describedby="commentError ? 'add-comment-text-error' : undefined"
    />
    <FieldMessage id="add-comment-text-error" :error="commentError" :length="comment.length" :max-length="TEXT_MAX_LENGTH" />
  </div>
</template>
