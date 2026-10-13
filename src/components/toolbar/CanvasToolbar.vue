<script setup lang="ts">
import { nextTick } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { LayoutGrid, Redo2, Undo2 } from '@lucide/vue'
import { useFlowStore } from '@/stores/useFlowStore'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import { Button } from '@/components/ui/button'

const flowStore = useFlowStore()
const createNodeModal = useCreateNodeModal()
const { fitView } = useVueFlow()

function handleClick() {
  if (flowStore.nodes.length === 0) {
    flowStore.createNode({ type: 'trigger' }, { mode: 'root' })
    return
  }

  createNodeModal.open({ source: 'toolbar' })
}

async function handleAutoAlign() {
  flowStore.autoAlign()
  await nextTick()
  fitView({ duration: 200 })
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button @click="handleClick">Create New Node</Button>
    <Button variant="outline" size="icon" aria-label="Undo" title="Undo (Ctrl/⌘+Z)" :disabled="!flowStore.canUndo" @click="flowStore.undo()">
      <Undo2 />
    </Button>
    <Button variant="outline" size="icon" aria-label="Redo" title="Redo (Ctrl/⌘+Shift+Z)" :disabled="!flowStore.canRedo" @click="flowStore.redo()">
      <Redo2 />
    </Button>
    <Button variant="outline" :disabled="flowStore.nodes.length === 0" @click="handleAutoAlign">
      <LayoutGrid />
      Auto-align
    </Button>
  </div>
</template>
