import { ref } from 'vue'
import type { NodeId } from '@/types/flow'

export type CreateNodeInvocation =
  | { source: 'toolbar' }
  | { source: 'quickAdd'; attachment: { mode: 'insert'; sourceId: NodeId; targetId: NodeId } | { mode: 'add'; parentId: NodeId } }

const isOpen = ref(false)
const invocation = ref<CreateNodeInvocation | null>(null)
// Last node created through the modal, so CanvasView can bring it into view.
const createdNodeId = ref<NodeId | null>(null)

/**
 * Module-level shared state: quick-add buttons live inside Vue Flow's
 * pan/zoom transform and must not render the modal themselves, so they
 * open it through this composable instead; the modal itself is rendered
 * once, as a sibling of <VueFlow>, in CanvasView.vue.
 */
export function useCreateNodeModal() {
  function open(next: CreateNodeInvocation) {
    invocation.value = next
    isOpen.value = true
  }

  function markCreated(nodeId: NodeId) {
    createdNodeId.value = nodeId
  }

  function close() {
    isOpen.value = false
    invocation.value = null
  }

  return { isOpen, invocation, createdNodeId, open, markCreated, close }
}
