<script setup lang="ts">
import { useFlowStore } from '@/stores/useFlowStore'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import { Button } from '@/components/ui/button'

const flowStore = useFlowStore()
const createNodeModal = useCreateNodeModal()

function handleClick() {
  if (flowStore.nodes.length === 0) {
    flowStore.createNode({ type: 'trigger' }, { mode: 'root' })
    return
  }

  createNodeModal.open({ source: 'toolbar' })
}
</script>

<template>
  <Button @click="handleClick">Create New Node</Button>
</template>
