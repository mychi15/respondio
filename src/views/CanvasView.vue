<script setup lang="ts">
import { computed, markRaw, nextTick, useTemplateRef, watch } from 'vue'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import type { GraphNode, NodeDragEvent, NodeMouseEvent } from '@vue-flow/core'
import { useEventListener, usePreferredReducedMotion } from '@vueuse/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import type { FlowNode } from '@/types/flow'
import { FLOW_NODE_TYPE_LABELS } from '@/types/flow'
import { isInteractiveNodeType } from '@/utils/flowGraph'
import { getNodeHeight, getNodeWidth } from '@/utils/flowLayout'
import FlowNodeRenderer from '@/components/nodes/FlowNodeRenderer.vue'
import FlowAddEdge from '@/components/edges/FlowAddEdge.vue'
import AddNodePlaceholder from '@/components/nodes/AddNodePlaceholder.vue'
import NodeDrawer from '@/components/nodes/NodeDrawer.vue'
import { ToastNotification } from '@/components/ui/toast'
import CanvasToolbar from '@/components/toolbar/CanvasToolbar.vue'
import CreateNodeModal from '@/components/toolbar/CreateNodeModal.vue'
import { useFlowStore } from '@/stores/useFlowStore'
import { useNodeDrawer } from '@/composables/useNodeDrawer'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import { useFlowQuery } from '@/composables/useFlowQuery'
import { useToast } from '@/composables/useToast'

const flowStore = useFlowStore()
const nodeDrawer = useNodeDrawer()
const createNodeModal = useCreateNodeModal()
const nodeTypes = { flowNode: markRaw(FlowNodeRenderer), addNodePlaceholder: markRaw(AddNodePlaceholder) }
const edgeTypes = { customEdge: markRaw(FlowAddEdge) }

const { fitView, findNode, getEdges, getSelectedNodes, addSelectedElements, removeSelectedElements, viewport, setCenter } = useVueFlow()

const { isLoading } = useFlowQuery()
const toast = useToast()

const canvasContainer = useTemplateRef<HTMLElement>('canvasContainer')

const canvasNodes = computed(() => [...flowStore.vueFlowNodes, ...flowStore.addNodePlaceholders.nodes])
const canvasEdges = computed(() => [...flowStore.vueFlowEdges, ...flowStore.addNodePlaceholders.edges])

// The node the drawer was opened from with focus moved into the drawer
// (keyboard opens, or any open in full-screen mode), so closing the drawer
// can hand focus back.
let focusOpener: HTMLElement | null = null

// The full-screen drawer is modal: the canvas behind it is made inert so
// Tab and screen readers can't reach it. Bound as `|| undefined` in the
// template: Vue would render `inert="false"`, which browsers treat as inert.
const isCanvasInert = computed(() => nodeDrawer.isOpen.value && nodeDrawer.isOverlay.value)

function openNodeDrawer(data: FlowNode | undefined, options: { focus?: boolean } = {}): boolean {
  if (!data || !isInteractiveNodeType(data.type)) return false
  nodeDrawer.open(data.id, options)
  return true
}

// The node a mouse click opened the drawer for. It's panned into view only
// after the drawer's layout change (and the fitView that follows) settles.
let pendingPanTarget: HTMLElement | null = null

function panToPendingTarget() {
  const element = pendingPanTarget
  pendingPanTarget = null
  const container = canvasContainer.value
  if (element?.isConnected && container) panIntoView(element, container)
}

function handleNodeClick({ node, event }: NodeMouseEvent) {
  focusOpener = null
  const wasOpen = nodeDrawer.isOpen.value
  // Full-screen, the clicked node goes inert, so focus has to move into the drawer.
  const focus = nodeDrawer.isOverlay.value
  if (!openNodeDrawer(node.data as FlowNode | undefined, { focus })) return
  const nodeElement = event.target instanceof Element ? event.target.closest<HTMLElement>('.vue-flow__node') : null
  if (focus) focusOpener = nodeElement
  pendingPanTarget = nodeElement
  // Switching nodes in an already-open drawer changes no layout, so pan now.
  if (wasOpen) panToPendingTarget()
}

function handlePaneClick() {
  focusOpener = null
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
    if (openNodeDrawer(node?.data as FlowNode | undefined, { focus: true })) focusOpener = nodeElement
  } else if (event.key === 'Escape') {
    nodeDrawer.close()
  }
}

function isCanvasFocusTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && (target.classList.contains('vue-flow__node') || !!target.closest('.vue-flow__edge-labels'))
}

const reducedMotion = usePreferredReducedMotion()

const PAN_DURATION = 600

// Ease-out cubic: moves off quickly and settles gently on the target.
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

// Pans (the canvas never scrolls) to center an element that's outside the
// visible area, keeping the current zoom.
function panIntoView(element: HTMLElement, container: HTMLElement) {
  const bounds = container.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  const isVisible = rect.left >= bounds.left && rect.right <= bounds.right && rect.top >= bounds.top && rect.bottom <= bounds.bottom
  if (isVisible) return

  const { x, y, zoom } = viewport.value
  const centerX = (rect.left + rect.width / 2 - bounds.left - x) / zoom
  const centerY = (rect.top + rect.height / 2 - bounds.top - y) / zoom
  setCenter(centerX, centerY, { zoom, duration: reducedMotion.value === 'reduce' ? 0 : PAN_DURATION, ease: easeOutCubic })
}

// Pressing on a node focuses it too; panning then would slide the node out
// from under the pointer before release and swallow the click. Mouse clicks
// pan via handleNodeClick instead, after the drawer has opened.
let pointerFocus = false
useEventListener(window, 'pointerdown', () => (pointerFocus = true), { capture: true })
useEventListener(window, 'keydown', () => (pointerFocus = false), { capture: true })

// Tabbing to a node or edge "+" button outside the visible area pans to it.
function handleCanvasFocusin(event: FocusEvent) {
  const container = event.currentTarget
  if (pointerFocus || !isCanvasFocusTarget(event.target) || !(container instanceof HTMLElement)) return

  // The browser may have natively scrolled an overflow-hidden ancestor to
  // reveal the focused element, which would offset the whole canvas.
  for (let element = event.target.parentElement; element && element !== container.parentElement; element = element.parentElement) {
    element.scrollTop = 0
    element.scrollLeft = 0
  }

  panIntoView(event.target, container)
}

// A newly created node can land off-screen (e.g. a new trigger to the right
// of everything), so pan to it once Vue Flow has rendered it.
watch(createNodeModal.createdNodeId, async (nodeId) => {
  if (nodeId === null) return
  await nextTick()
  const container = canvasContainer.value
  const element = container?.querySelector<HTMLElement>(`.vue-flow__node[data-id="${nodeId}"]`)
  if (container && element) panIntoView(element, container)
})

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

// Saves are optimistic, so after a failed or still-running save the edits
// exist only in this tab. Ask before closing or reloading it rather than drop
// them silently. returnValue is the legacy way to trigger the same prompt.
useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (!flowStore.hasUnsavedChanges()) return
  event.preventDefault()
  event.returnValue = ''
})

// Undo/redo can remove the node the drawer is showing (e.g. undoing a create).
watch(
  () => flowStore.nodes,
  (nodes) => {
    const selectedId = nodeDrawer.selectedNodeId.value
    if (selectedId !== null && !nodes.some((node) => String(node.id) === String(selectedId))) nodeDrawer.close()
  },
)

// A /node/:nodeId link can point at a node that doesn't exist (a stale or
// mistyped link) or one with no drawer (trigger, connector). Checked once the
// flow has loaded (or fallen back to the sample flow); 'post' so it runs
// after useFlowQuery has synced the store.
watch(
  [() => nodeDrawer.selectedNodeId.value, isLoading],
  ([nodeId, loading]) => {
    if (nodeId === null || loading) return
    const node = flowStore.nodes.find((candidate) => String(candidate.id) === String(nodeId))
    if (node && isInteractiveNodeType(node.type)) return
    toast.show(node ? `${FLOW_NODE_TYPE_LABELS[node.type]} nodes have no details to edit.` : 'That node no longer exists.', 'warning')
    nodeDrawer.close({ replace: true })
  },
  { immediate: true, flush: 'post' },
)

let fitViewTimeout: ReturnType<typeof setTimeout> | undefined

watch(
  [() => nodeDrawer.isOpen.value, () => nodeDrawer.displayWidth.value, () => nodeDrawer.isOverlay.value],
  () => {
    clearTimeout(fitViewTimeout)
    // A full-screen drawer covers the canvas without resizing it.
    if (nodeDrawer.isOverlay.value) {
      pendingPanTarget = null
      return
    }
    fitViewTimeout = setTimeout(async () => {
      await nextTick()
      await fitView({ duration: 200 })
      panToPendingTarget()
    }, 100)
  },
)

watch(
  () => nodeDrawer.selectedNodeId.value,
  (nodeId) => {
    if (nodeId === null) {
      removeSelectedElements()
      const opener = focusOpener
      focusOpener = null
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
    :style="{ gridTemplateColumns: `1fr ${nodeDrawer.isOpen.value && !nodeDrawer.isOverlay.value ? nodeDrawer.displayWidth.value : 0}px` }"
  >
    <div
      ref="canvasContainer"
      :inert="isCanvasInert || undefined"
      class="relative h-full min-w-0 overflow-hidden"
      @keydown="handleCanvasKeydown"
      @keyup="handleCanvasKeyup"
      @focusin="handleCanvasFocusin"
    >
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
      <!-- Under the toolbar row: the bottom of the canvas is taken by Vue Flow's controls. -->
      <div v-if="flowStore.isSampleData" class="pointer-events-none absolute inset-x-4 top-16 z-10 flex justify-center">
        <p role="status" class="pointer-events-auto max-w-md rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-center text-xs text-amber-900 shadow-sm">
          Couldn't reach the server, so this is sample data. Changes won't be saved.
        </p>
      </div>
      <CreateNodeModal />
    </div>
    <NodeDrawer />
  </div>
</template>
