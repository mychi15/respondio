<script setup lang="ts">
import { computed } from 'vue'
import type { NodeId } from '@/types/flow'
import { CREATABLE_NODE_TYPES, TOOLBAR_CREATABLE_NODE_TYPES } from '@/types/flow'
import type { CreatableNodeType } from '@/types/flow'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import { useFlowStore } from '@/stores/useFlowStore'
import type { CreateNodeAttachment } from '@/stores/useFlowStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CreateNodeForm from './CreateNodeForm.vue'

const createNodeModal = useCreateNodeModal()
const flowStore = useFlowStore()

const types = computed(() => (createNodeModal.invocation.value?.source === 'toolbar' ? TOOLBAR_CREATABLE_NODE_TYPES : CREATABLE_NODE_TYPES))

const requiresParent = computed(() => createNodeModal.invocation.value?.source === 'toolbar')

function handleSubmit(input: { name?: string; description?: string; type: CreatableNodeType; parentId: NodeId | null }) {
  const invocation = createNodeModal.invocation.value
  if (!invocation) return

  let attachment: CreateNodeAttachment
  if (input.type === 'trigger') {
    attachment = { mode: 'root' }
  } else if (invocation.source === 'quickAdd') {
    attachment = invocation.attachment
  } else {
    if (input.parentId === null) return
    attachment = { mode: 'add', parentId: input.parentId }
  }

  flowStore.createNode({ name: input.name, description: input.description, type: input.type }, attachment)
  createNodeModal.close()
}
</script>

<template>
  <Dialog :open="createNodeModal.isOpen.value" @update:open="(open) => !open && createNodeModal.close()">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Node</DialogTitle>
      </DialogHeader>
      <CreateNodeForm :types="types" :requires-parent="requiresParent" @submit="handleSubmit" />
    </DialogContent>
  </Dialog>
</template>
