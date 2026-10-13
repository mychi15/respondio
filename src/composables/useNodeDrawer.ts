import { computed, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'
import type { NodeId } from '@/types/flow'
import { router } from '@/router'

export const DRAWER_MIN_WIDTH = 379
export const DRAWER_MAX_WIDTH = 720
export const DRAWER_DEFAULT_WIDTH = 399

export const DRAWER_OVERLAY_BREAKPOINT = 768
export const CANVAS_MIN_WIDTH = 320

// The URL is the source of truth for which node the drawer shows, so a
// /node/:nodeId link (shared, refreshed, or Back/Forward) opens the drawer.
const selectedNodeId = computed<NodeId | null>(() => {
  const { nodeId } = router.currentRoute.value.params
  return typeof nodeId === 'string' ? nodeId : null
})
const isOpen = computed(() => selectedNodeId.value !== null)
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
  async function open(nodeId: NodeId, options: { focus?: boolean } = {}) {
    await router.push({ name: 'node-detail', params: { nodeId: String(nodeId) } })
    // Bumped only after navigating, so the drawer has rendered by the time
    // NodeDrawer moves focus into it.
    if (options.focus) focusRequest.value++
  }

  // `replace` drops the /node/:nodeId entry from history, for links that
  // shouldn't be returned to with Back (e.g. one to a missing node).
  async function close(options: { replace?: boolean } = {}) {
    if (!isOpen.value) return
    await (options.replace ? router.replace({ name: 'canvas' }) : router.push({ name: 'canvas' }))
  }

  function setWidth(next: number) {
    width.value = Math.min(maxWidth.value, Math.max(DRAWER_MIN_WIDTH, next))
  }

  function setResizing(next: boolean) {
    isResizing.value = next
  }

  return { isOpen, selectedNodeId, width, displayWidth, isOverlay, isResizing, focusRequest, open, close, setWidth, setResizing }
}
