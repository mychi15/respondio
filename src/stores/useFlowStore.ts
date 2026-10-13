import { defineStore } from 'pinia'
import { computed, ref, toRaw } from 'vue'
import { useManualRefHistory } from '@vueuse/core'
import { useMutation } from '@tanstack/vue-query'
import type { BusinessHoursNode, ConnectorNode, CreatableNodeType, FlowNode, FlowPosition, NodeId, SendMessagePayloadItem } from '@/types/flow'
import { buildAddNodePlaceholders, buildEdgesFromNodes, toVueFlowNodes } from '@/utils/flowGraph'
import {
  applyAutoLayout,
  computeNodePositions,
  CONNECTOR_HEIGHT,
  DEFAULT_VERTICAL_SPACING,
  fillMissingPositions,
  getNodeHeight,
  HORIZONTAL_SPACING,
  positionBelow,
  shiftSubtree,
} from '@/utils/flowLayout'
import { generateNodeId } from '@/utils/helpers'
import { saveFlow } from '@/api/flowApi'
import { useToast } from '@/composables/useToast'
import { FLOW_QUERY_KEY, queryClient } from '@/lib/queryClient'

export type CreateNodeAttachment =
  | { mode: 'root' }
  | { mode: 'insert'; sourceId: NodeId; targetId: NodeId }
  | { mode: 'add'; parentId: NodeId }

export interface CreateNodeInput {
  name?: string
  description?: string
  type: CreatableNodeType
}

function createDataForType(type: CreatableNodeType): FlowNode['data'] {
  switch (type) {
    case 'trigger':
      return { type: 'conversationOpened', oncePerContact: false }
    case 'sendMessage':
      return { payload: [] }
    case 'addComment':
      return { comment: '' }
    case 'dateTime':
      return { times: [], connectors: [], timezone: 'UTC', action: 'businessHours' }
  }
}

export const useFlowStore = defineStore('flow', () => {
  const nodes = ref<FlowNode[]>([])

  // Positions are stored on each node; auto-layout only fills the gaps for
  // nodes that were never given one (e.g. state set directly in tests).
  const nodePositions = computed(() => {
    const fallback = nodes.value.every((node) => node.position) ? undefined : computeNodePositions(nodes.value)
    return new Map(nodes.value.map((node) => [node.id, node.position ?? fallback!.get(node.id)!]))
  })
  const vueFlowNodes = computed(() => toVueFlowNodes(nodes.value, nodePositions.value))
  const vueFlowEdges = computed(() => buildEdgesFromNodes(nodes.value))
  const addNodePlaceholders = computed(() => buildAddNodePlaceholders(nodes.value, nodePositions.value))

  const toast = useToast()

  // Snapshot history of the whole flow. persist() is the single commit point,
  // so each user action (save, create, delete, drag, auto-align) is one entry.
  // Cloned via JSON rather than structuredClone: arrays rebuilt from the
  // reactive state (e.g. deleteNode's filter) hold reactive Proxies, which
  // structuredClone can't clone. The flow is plain JSON data anyway.
  const history = useManualRefHistory(nodes, { clone: (value) => JSON.parse(JSON.stringify(value)), capacity: 50 })

  // Query owns the server copy of the flow; this store owns the editable
  // working copy (and its undo history). Every save goes through this mutation,
  // which writes the flow back and keeps the ['flow'] cache in step with it.
  // The shared scope makes Query run saves one at a time, in call order, so a
  // faster later request can't land first and be overwritten by older data.
  const saveMutation = useMutation(
    {
      mutationKey: [...FLOW_QUERY_KEY, 'save'],
      scope: { id: 'flow-save' },
      mutationFn: saveFlow,
      onSuccess: (_, savedNodes) => queryClient.setQueryData(FLOW_QUERY_KEY, savedNodes),
      onError: () => toast.show('Failed to save changes. Please try again.'),
    },
    queryClient,
  )

  function save(): Promise<void> {
    // Snapshot now: queued saves wait their turn, and each must send the flow
    // as it was when it was made, not whatever it is by the time it runs.
    const snapshot: FlowNode[] = JSON.parse(JSON.stringify(nodes.value))
    const attempt = saveMutation.mutateAsync(snapshot)
    // onError has already shown the toast; this keeps fire-and-forget callers
    // from raising an unhandled rejection, while awaiting callers still see it.
    attempt.catch(() => {})
    return attempt
  }

  function persist(): Promise<void> {
    // Skip no-op saves (e.g. "Save changes" with nothing edited) so they
    // don't add an undo step that appears to do nothing.
    if (JSON.stringify(nodes.value) !== JSON.stringify(history.last.value.snapshot)) history.commit()
    return save()
  }

  function undo(): void {
    if (!history.canUndo.value) return
    history.undo()
    save()
  }

  function redo(): void {
    if (!history.canRedo.value) return
    history.redo()
    save()
  }

  function setNodes(next: FlowNode[]): void {
    // toRaw() unwraps Vue Query's reactive Proxy so structuredClone can clone
    // it into a plain, mutable array.
    const cloned = structuredClone(toRaw(next))
    fillMissingPositions(cloned)
    nodes.value = cloned
    // The loaded flow becomes the history baseline.
    history.commit()
    history.clear()
  }

  function createNode(input: CreateNodeInput, attachment: CreateNodeAttachment): FlowNode {
    const existingIds = new Set(nodes.value.map((node) => node.id))
    const parentId = attachment.mode === 'root' ? -1 : attachment.mode === 'add' ? attachment.parentId : attachment.sourceId

    const newNode = {
      id: generateNodeId(existingIds),
      parentId,
      type: input.type,
      data: createDataForType(input.type),
      ...(input.type !== 'trigger' && { name: input.name, description: input.description }),
    } as FlowNode

    if (attachment.mode === 'root') {
      const xs = nodes.value.map((node) => nodePositions.value.get(node.id)!.x)
      newNode.position = { x: xs.length > 0 ? Math.max(...xs) + HORIZONTAL_SPACING : 0, y: 0 }
    } else if (attachment.mode === 'add') {
      const parent = nodes.value.find((node) => node.id === attachment.parentId)
      newNode.position = parent ? positionBelow(parent, newNode) : { x: 0, y: 0 }
    } else {
      const target = nodes.value.find((node) => node.id === attachment.targetId)
      const source = nodes.value.find((node) => node.id === attachment.sourceId)
      if (target?.position) {
        // Take the target's slot (top-aligned) and push its subtree down to
        // make room. A dateTime node also brings a connector row, and the
        // target moves sideways to sit under the success connector.
        newNode.position = { x: target.position.x, y: target.position.y - getNodeHeight(target) / 2 + getNodeHeight(newNode) / 2 }
        const isDateTime = newNode.type === 'dateTime'
        const connectorRow = isDateTime ? CONNECTOR_HEIGHT + DEFAULT_VERTICAL_SPACING : 0
        shiftSubtree(
          nodes.value,
          target.id,
          getNodeHeight(newNode) + DEFAULT_VERTICAL_SPACING + connectorRow,
          isDateTime ? -HORIZONTAL_SPACING / 2 : 0,
        )
      } else {
        newNode.position = source ? positionBelow(source, newNode) : { x: 0, y: 0 }
      }
      // A dateTime node only takes its two connectors as children, so the
      // target is re-attached to the success connector below instead.
      if (target && newNode.type !== 'dateTime') target.parentId = newNode.id
    }

    nodes.value.push(newNode)

    if (newNode.type === 'dateTime') {
      existingIds.add(newNode.id)
      const successId = generateNodeId(existingIds)
      existingIds.add(successId)
      const failureId = generateNodeId(existingIds)

      const connectors: ConnectorNode[] = [
        { id: successId, parentId: newNode.id, type: 'dateTimeConnector', data: { connectorType: 'success' } },
        { id: failureId, parentId: newNode.id, type: 'dateTimeConnector', data: { connectorType: 'failure' } },
      ]
      connectors[0].position = positionBelow(newNode, connectors[0], -HORIZONTAL_SPACING / 2)
      connectors[1].position = positionBelow(newNode, connectors[1], HORIZONTAL_SPACING / 2)
      nodes.value.push(...connectors)
      newNode.data.connectors = [successId, failureId]

      if (attachment.mode === 'insert') {
        const target = nodes.value.find((node) => node.id === attachment.targetId)
        if (target) target.parentId = successId
      }
    }

    // Not awaited: optimistic UI, failures surface via persist()'s toast.
    persist()
    return newNode
  }

  function updateNode(id: NodeId, patch: { name?: string; description?: string }): void {
    const node = nodes.value.find((candidate) => candidate.id === id)
    if (!node) return
    Object.assign(node, patch)
  }

  function updateBusinessHours(id: NodeId, patch: Partial<Pick<BusinessHoursNode['data'], 'times' | 'timezone'>>): void {
    const node = nodes.value.find((candidate) => candidate.id === id)
    if (!node || node.type !== 'dateTime') return
    Object.assign(node.data, patch)
  }

  function updateSendMessagePayload(id: NodeId, payload: SendMessagePayloadItem[]): void {
    const node = nodes.value.find((candidate) => candidate.id === id)
    if (!node || node.type !== 'sendMessage') return
    node.data.payload = payload
  }

  function updateComment(id: NodeId, comment: string): void {
    const node = nodes.value.find((candidate) => candidate.id === id)
    if (!node || node.type !== 'addComment') return
    node.data.comment = comment
  }

  function deleteNode(id: NodeId): void {
    const idsToDelete = new Set<NodeId>([id])
    let grew = true
    while (grew) {
      grew = false
      for (const node of nodes.value) {
        if (!idsToDelete.has(node.id) && idsToDelete.has(node.parentId)) {
          idsToDelete.add(node.id)
          grew = true
        }
      }
    }
    nodes.value = nodes.value.filter((node) => !idsToDelete.has(node.id))
    persist()
  }

  function moveNodes(moves: Array<{ id: NodeId; position: FlowPosition }>): void {
    let moved = false
    for (const { id, position } of moves) {
      const node = nodes.value.find((candidate) => candidate.id === id)
      if (!node || (node.position?.x === position.x && node.position?.y === position.y)) continue
      node.position = { x: position.x, y: position.y }
      moved = true
    }
    if (moved) persist()
  }

  function autoAlign(): void {
    applyAutoLayout(nodes.value)
    persist()
  }

  return {
    nodes,
    vueFlowNodes,
    vueFlowEdges,
    addNodePlaceholders,
    setNodes,
    createNode,
    updateNode,
    updateBusinessHours,
    updateSendMessagePayload,
    updateComment,
    deleteNode,
    moveNodes,
    autoAlign,
    persist,
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  }
})
