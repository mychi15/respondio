import { defineStore } from 'pinia'
import { computed, ref, toRaw } from 'vue'
import type { BusinessHoursNode, ConnectorNode, CreatableNodeType, FlowNode, NodeId, SendMessagePayloadItem } from '@/types/flow'
import { buildAddNodePlaceholders, buildEdgesFromNodes, toVueFlowNodes } from '@/utils/flowGraph'
import { computeNodePositions } from '@/utils/flowLayout'
import { generateNodeId } from '@/utils/helpers'
import { saveFlow } from '@/api/flowApi'
import { useToast } from '@/composables/useToast'

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

  const nodePositions = computed(() => computeNodePositions(nodes.value))
  const vueFlowNodes = computed(() => toVueFlowNodes(nodes.value, nodePositions.value))
  const vueFlowEdges = computed(() => buildEdgesFromNodes(nodes.value))
  const addNodePlaceholders = computed(() => buildAddNodePlaceholders(nodes.value, nodePositions.value))

  const toast = useToast()

  // Chained to preserve save order — otherwise a faster second request could
  // land before the first and get overwritten by older data.
  let pendingSave: Promise<void> = Promise.resolve()

  function persist(): Promise<void> {
    const attempt = pendingSave.catch(() => {}).then(() => saveFlow(nodes.value))
    pendingSave = attempt.catch(() => toast.show('Failed to save changes. Please try again.'))
    return attempt
  }

  function setNodes(next: FlowNode[]): void {
    // toRaw() unwraps Vue Query's reactive Proxy so structuredClone can clone
    // it into a plain, mutable array.
    nodes.value = structuredClone(toRaw(next))
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

    if (attachment.mode === 'insert') {
      const target = nodes.value.find((node) => node.id === attachment.targetId)
      if (target) target.parentId = newNode.id
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
      nodes.value.push(...connectors)
      newNode.data.connectors = [successId, failureId]
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
    persist,
  }
})
