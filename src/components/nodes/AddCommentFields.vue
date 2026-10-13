<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AddCommentNode } from '@/types/flow'
import { useFlowStore } from '@/stores/useFlowStore'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

function save() {
  flowStore.updateComment(props.node.id, comment.value.trim())
}

defineExpose({ save })
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <Label for="add-comment-text">Comment</Label>
    <Textarea id="add-comment-text" v-model="comment" placeholder="Optional comment text" />
  </div>
</template>
