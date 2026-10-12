import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CreatableNodeType, FlowNode, NodeId } from '@/types/flow'
import { buildAddNodePlaceholders, buildEdgesFromNodes, toVueFlowNodes } from '@/utils/flowGraph'
import { computeNodePositions } from '@/utils/flowLayout'
import { generateNodeId } from '@/utils/helpers'
import { sampleFlowNodes } from './sampleFlow'

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
  const nodes = ref<FlowNode[]>(sampleFlowNodes)

  const nodePositions = computed(() => computeNodePositions(nodes.value))
  const vueFlowNodes = computed(() => toVueFlowNodes(nodes.value, nodePositions.value))
  const vueFlowEdges = computed(() => buildEdgesFromNodes(nodes.value))
  const addNodePlaceholders = computed(() => buildAddNodePlaceholders(nodes.value, nodePositions.value))

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
    return newNode
  }

  return { nodes, vueFlowNodes, vueFlowEdges, addNodePlaceholders, createNode }
})
