import { computed, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'
import type { NodeId } from '@/types/flow'

export const DRAWER_MIN_WIDTH = 379
export const DRAWER_MAX_WIDTH = 720
export const DRAWER_DEFAULT_WIDTH = 399

export const DRAWER_OVERLAY_BREAKPOINT = 768
export const CANVAS_MIN_WIDTH = 320

const isOpen = ref(false)
const selectedNodeId = ref<NodeId | null>(null)
const width = ref(DRAWER_DEFAULT_WIDTH)
const isResizing = ref(false)
const { width: viewportWidth } = useWindowSize()

const isOverlay = computed(() => viewportWidth.value < DRAWER_OVERLAY_BREAKPOINT)
const maxWidth = computed(() => Math.max(DRAWER_MIN_WIDTH, Math.min(DRAWER_MAX_WIDTH, viewportWidth.value - CANVAS_MIN_WIDTH)))
const displayWidth = computed(() => Math.min(width.value, maxWidth.value))
// Bumped when an open should move focus into the drawer (keyboard opens);
// NodeDrawer watches it. A counter so reopening the same node still fires.
const focusRequest = ref(0)

/**
 * Module-level shared state, same pattern as useCreateNodeModal: the drawer
 * is rendered once as a sibling of <VueFlow> in CanvasView, but opened from
 * inside Vue Flow's node-click handler. Width is kept here too since
 * CanvasView needs it to size the grid column the drawer lives in.
 */
export function useNodeDrawer() {
  function open(nodeId: NodeId, options: { focus?: boolean } = {}) {
    selectedNodeId.value = nodeId
    isOpen.value = true
    if (options.focus) focusRequest.value++
  }

  function close() {
    isOpen.value = false
    selectedNodeId.value = null
  }

  function setWidth(next: number) {
    width.value = Math.min(maxWidth.value, Math.max(DRAWER_MIN_WIDTH, next))
  }

  function setResizing(next: boolean) {
    isResizing.value = next
  }

  return { isOpen, selectedNodeId, width, displayWidth, isOverlay, isResizing, focusRequest, open, close, setWidth, setResizing }
}
