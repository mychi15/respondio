<script setup lang="ts">
import { computed } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import FlowNodeRenderer from '@/components/FlowNodeRenderer.vue'
import FlowAddEdge from '@/components/edges/FlowAddEdge.vue'
import AddNodePlaceholder from '@/components/nodes/AddNodePlaceholder.vue'
import CanvasToolbar from '@/components/toolbar/CanvasToolbar.vue'
import CreateNodeModal from '@/components/toolbar/CreateNodeModal.vue'
import { useFlowStore } from '@/stores/useFlowStore'

const flowStore = useFlowStore()
const nodeTypes = { flowNode: FlowNodeRenderer, addNodePlaceholder: AddNodePlaceholder }
const edgeTypes = { customEdge: FlowAddEdge }

const canvasNodes = computed(() => [...flowStore.vueFlowNodes, ...flowStore.addNodePlaceholders.nodes])
const canvasEdges = computed(() => [...flowStore.vueFlowEdges, ...flowStore.addNodePlaceholders.edges])
</script>

<template>
  <div class="h-screen w-screen">
    <VueFlow
      :nodes="canvasNodes"
      :edges="canvasEdges"
      :node-types="nodeTypes"
      :edge-types="edgeTypes"
      :nodes-draggable="false"
      fit-view-on-init
    >
      <Background />
      <Controls />
    </VueFlow>
    <CanvasToolbar />
    <CreateNodeModal />
  </div>
</template>
