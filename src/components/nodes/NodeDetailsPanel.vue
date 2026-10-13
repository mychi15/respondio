<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { NodeId } from '@/types/flow'
import { FLOW_NODE_TYPE_LABELS } from '@/types/flow'
import { isInteractiveNodeType } from '@/utils/flowGraph'
import { useFlowStore } from '@/stores/useFlowStore'
import { useToast } from '@/composables/useToast'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SheetFooter } from '@/components/ui/sheet'
import BusinessHoursFields from './BusinessHoursFields.vue'
import SendMessageFields from './SendMessageFields.vue'
import AddCommentFields from './AddCommentFields.vue'
import DeleteNodeButton from './DeleteNodeButton.vue'

const props = withDefaults(defineProps<{ nodeId: NodeId; showFooter?: boolean }>(), { showFooter: true })
const emit = defineEmits<{ deleted: [] }>()

const flowStore = useFlowStore()

const node = computed(() => flowStore.nodes.find((candidate) => String(candidate.id) === String(props.nodeId)))

const isEditable = computed(() => Boolean(node.value) && isInteractiveNodeType(node.value!.type))

const form = reactive({ name: '', description: '' })

watch(
  node,
  (next) => {
    form.name = next?.name ?? ''
    form.description = next?.description ?? ''
  },
  { immediate: true },
)

const typeFieldsRef = ref<{ save?: () => void } | null>(null)

const toast = useToast()

function saveChanges() {
  if (!node.value) return
  flowStore.updateNode(node.value.id, { name: form.name.trim(), description: form.description.trim() || undefined })
  typeFieldsRef.value?.save?.()
  flowStore.persist()

  toast.show('Changes saved')
}

function handleDeleted() {
  emit('deleted')
}
</script>

<template>
  <div v-if="!node" class="flex flex-col gap-1.5 text-sm text-gray-500">
    <p>Node not found.</p>
  </div>
  <div v-else-if="!isEditable" class="flex flex-col gap-1.5 text-sm text-gray-500">
    <p>{{ FLOW_NODE_TYPE_LABELS[node.type] }} nodes aren't editable.</p>
  </div>
  <div v-else class="flex h-full min-w-0 flex-col gap-4">
    <div class="flex flex-col gap-1.5">
      <Label for="node-details-name">Title</Label>
      <Input id="node-details-name" v-model="form.name" placeholder="Node title" />
    </div>

    <div class="flex flex-col gap-1.5">
      <Label for="node-details-description">Description</Label>
      <Textarea
        id="node-details-description"
        v-model="form.description"
        placeholder="Optional description"
      />
    </div>

    <slot :node="node">
      <BusinessHoursFields v-if="node.type === 'dateTime'" ref="typeFieldsRef" :node="node" />
      <SendMessageFields v-else-if="node.type === 'sendMessage'" ref="typeFieldsRef" :node="node" />
      <AddCommentFields v-else-if="node.type === 'addComment'" ref="typeFieldsRef" :node="node" />
    </slot>

    <Button class="self-start" @click="saveChanges">Save changes</Button>

    <SheetFooter v-if="showFooter" class="border-t border-gray-200 px-0">
      <DeleteNodeButton :node-id="node.id" @deleted="handleDeleted" />
    </SheetFooter>
  </div>
</template>
