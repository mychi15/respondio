<script setup lang="ts">
import { computed, markRaw, nextTick, watch } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import type { GraphNode, NodeDragEvent, NodeMouseEvent } from '@vue-flow/core'
import { useEventListener } from '@vueuse/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import type { FlowNode } from '@/types/flow'
import { isInteractiveNodeType } from '@/utils/flowGraph'
import { getNodeHeight, getNodeWidth } from '@/utils/flowLayout'
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

const { fitView, findNode, getEdges, getSelectedNodes, addSelectedElements, removeSelectedElements, viewport, setCenter } = useVueFlow()

const { isLoading } = useFlowQuery()

const canvasNodes = computed(() => [...flowStore.vueFlowNodes, ...flowStore.addNodePlaceholders.nodes])
const canvasEdges = computed(() => [...flowStore.vueFlowEdges, ...flowStore.addNodePlaceholders.edges])

// The node a keyboard open came from, so closing the drawer can hand focus back.
let keyboardOpener: HTMLElement | null = null

function openNodeDrawer(data: FlowNode | undefined, options: { focus?: boolean } = {}): boolean {
  if (!data || !isInteractiveNodeType(data.type)) return false
  nodeDrawer.open(data.id, options)
  return true
}

function handleNodeClick({ node }: NodeMouseEvent) {
  keyboardOpener = null
  openNodeDrawer(node.data as FlowNode | undefined)
}

function handlePaneClick() {
  keyboardOpener = null
  nodeDrawer.close()
}

// Vue Flow reports top-left positions; the store keeps node centers.
function toCenterMoves(nodes: GraphNode[]) {
  return nodes.flatMap(({ data, position }) => {
    const node = data as FlowNode | undefined
    if (!node) return []
    return [{ id: node.id, position: { x: position.x + getNodeWidth(node) / 2, y: position.y + getNodeHeight(node) / 2 } }]
  })
}

function handleNodeDragStop({ nodes }: NodeDragEvent) {
  flowStore.moveNodes(toCenterMoves(nodes))
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

function getNodeElement(event: KeyboardEvent): HTMLElement | null {
  if (isEditableTarget(event.target) || !(event.target instanceof HTMLElement)) return null
  return event.target.classList.contains('vue-flow__node') ? event.target : null
}

// Vue Flow's own node keydown only selects on Enter/Space (it doesn't emit
// node-click), so opening the drawer from the keyboard is handled here.
function handleCanvasKeydown(event: KeyboardEvent) {
  const nodeElement = getNodeElement(event)
  if (!nodeElement) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const node = nodeElement.dataset.id ? findNode(nodeElement.dataset.id) : undefined
    if (openNodeDrawer(node?.data as FlowNode | undefined, { focus: true })) keyboardOpener = nodeElement
  } else if (event.key === 'Escape') {
    nodeDrawer.close()
  }
}

function isCanvasFocusTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && (target.classList.contains('vue-flow__node') || !!target.closest('.vue-flow__edge-labels'))
}

// Tabbing to a node or edge "+" button outside the visible area pans the
// viewport to it, as panning (not scrolling) is how the canvas moves.
function handleCanvasFocusin(event: FocusEvent) {
  const container = event.currentTarget
  if (!isCanvasFocusTarget(event.target) || !(container instanceof HTMLElement)) return

  // The browser may have natively scrolled an overflow-hidden ancestor to
  // reveal the focused element, which would offset the whole canvas.
  for (let element = event.target.parentElement; element && element !== container.parentElement; element = element.parentElement) {
    element.scrollTop = 0
    element.scrollLeft = 0
  }

  const bounds = container.getBoundingClientRect()
  const rect = event.target.getBoundingClientRect()
  const isVisible = rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top && rect.bottom <= bounds.bottom
  if (isVisible) return

  const { x, y, zoom } = viewport.value
  const centerX = (rect.left + rect.width / 2 - bounds.left - x) / zoom
  const centerY = (rect.top + rect.height / 2 - bounds.top - y) / zoom
  setCenter(centerX, centerY, { zoom, duration: 200 })
}

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

// Vue Flow moves selected nodes on arrow keydown without a drag-stop event;
// persist on keyup so a held key is a single undo step.
function handleCanvasKeyup(event: KeyboardEvent) {
  if (!ARROW_KEYS.includes(event.key) || !getNodeElement(event)) return
  flowStore.moveNodes(toCenterMoves(getSelectedNodes.value))
}

// Leave Cmd/Ctrl+Z inside form fields to the browser's own text undo.
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (isEditableTarget(event.target) || !(event.metaKey || event.ctrlKey)) return
  const key = event.key.toLowerCase()
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault()
    flowStore.undo()
  } else if ((key === 'z' && event.shiftKey) || (key === 'y' && event.ctrlKey)) {
    event.preventDefault()
    flowStore.redo()
  }
})

// Undo/redo can remove the node the drawer is showing (e.g. undoing a create).
watch(
  () => flowStore.nodes,
  (nodes) => {
    const selectedId = nodeDrawer.selectedNodeId.value
    if (selectedId !== null && !nodes.some((node) => String(node.id) === String(selectedId))) nodeDrawer.close()
  },
)

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
      const opener = keyboardOpener
      keyboardOpener = null
      if (opener) nextTick(() => opener.isConnected && opener.focus())
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
    <div class="relative h-full min-w-0 overflow-hidden" @keydown="handleCanvasKeydown" @keyup="handleCanvasKeyup" @focusin="handleCanvasFocusin">
      <div v-if="isLoading" class="absolute inset-0 z-20 flex items-center justify-center bg-white/80 text-sm text-gray-500">
        Loading flow…
      </div>
      <VueFlow
        :nodes="canvasNodes"
        :edges="canvasEdges"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        fit-view-on-init
        :delete-key-code="null"
        :edges-focusable="false"
        @node-click="handleNodeClick"
        @pane-click="handlePaneClick"
        @node-drag-stop="handleNodeDragStop"
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
