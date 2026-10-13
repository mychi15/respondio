<script setup lang="ts">
import { computed, markRaw, nextTick, watch } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import type { NodeMouseEvent } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import type { FlowNode } from '@/types/flow'
import { isInteractiveNodeType } from '@/utils/flowGraph'
import FlowNodeRenderer from '@/components/nodes/FlowNodeRenderer.vue'
import FlowAddEdge from '@/components/edges/FlowAddEdge.vue'
import AddNodePlaceholder from '@/components/nodes/AddNodePlaceholder.vue'
import NodeDrawer from '@/components/nodes/NodeDrawer.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import CanvasToolbar from '@/components/toolbar/CanvasToolbar.vue'
import CreateNodeModal from '@/components/toolbar/CreateNodeModal.vue'
import { useFlowStore } from '@/stores/useFlowStore'
import { useNodeDrawer } from '@/composables/useNodeDrawer'
import { useFlowQuery } from '@/composables/useFlowQuery'

const flowStore = useFlowStore()
const nodeDrawer = useNodeDrawer()
const nodeTypes = { flowNode: markRaw(FlowNodeRenderer), addNodePlaceholder: markRaw(AddNodePlaceholder) }
const edgeTypes = { customEdge: markRaw(FlowAddEdge) }

const { fitView, findNode, getEdges, addSelectedElements, removeSelectedElements } = useVueFlow()

const { isLoading } = useFlowQuery()

const canvasNodes = computed(() => [...flowStore.vueFlowNodes, ...flowStore.addNodePlaceholders.nodes])
const canvasEdges = computed(() => [...flowStore.vueFlowEdges, ...flowStore.addNodePlaceholders.edges])

function handleNodeClick({ node }: NodeMouseEvent) {
  const data = node.data as FlowNode | undefined
  if (!data || !isInteractiveNodeType(data.type)) return
  nodeDrawer.open(data.id)
}

function handlePaneClick() {
  nodeDrawer.close()
}

let fitViewTimeout: ReturnType<typeof setTimeout> | undefined

watch(
  [() => nodeDrawer.isOpen.value, () => nodeDrawer.width.value],
  () => {
    clearTimeout(fitViewTimeout)
    fitViewTimeout = setTimeout(async () => {
      await nextTick()
      fitView({ duration: 200 })
    }, 100)
  },
)

watch(
  () => nodeDrawer.selectedNodeId.value,
  (nodeId) => {
    if (nodeId === null) {
      removeSelectedElements()
      return
    }

    const node = findNode(String(nodeId))
    if (!node) return
    const childEdges = getEdges.value.filter((edge) => edge.source === String(nodeId))
    addSelectedElements([node, ...childEdges])
  },
)
</script>

<template>
  <div
    class="grid h-screen w-screen"
    :class="!nodeDrawer.isResizing.value && 'transition-[grid-template-columns] duration-200 ease-out'"
    :style="{ gridTemplateColumns: `1fr ${nodeDrawer.isOpen.value ? nodeDrawer.width.value : 0}px` }"
  >
    <div class="relative h-full min-w-0 overflow-hidden">
      <div v-if="isLoading" class="absolute inset-0 z-20 flex items-center justify-center bg-white/80 text-sm text-gray-500">
        Loading flow…
      </div>
      <VueFlow
        :nodes="canvasNodes"
        :edges="canvasEdges"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :nodes-draggable="false"
        fit-view-on-init
        @node-click="handleNodeClick"
        @pane-click="handlePaneClick"
      >
        <Background />
        <Controls />
      </VueFlow>
      <div class="absolute inset-x-4 top-4 z-10 flex items-start gap-4">
        <CanvasToolbar />
        <div class="flex flex-1 justify-center">
          <ToastNotification />
        </div>
      </div>
      <CreateNodeModal />
    </div>
    <NodeDrawer />
  </div>
</template>
