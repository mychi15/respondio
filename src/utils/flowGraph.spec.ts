import { describe, expect, it } from 'vitest'
import type { FlowNode } from '@/types/flow'
import {
  CONNECTOR_WIDTH,
  DEFAULT_VERTICAL_SPACING,
  NODE_WIDTH,
  computeNodePositions,
  getNodeHeight,
} from './flowLayout'
import {
  buildAddNodePlaceholders,
  buildEdgesFromNodes,
  buildNodeTree,
  getNodeDescription,
  isInteractiveNodeType,
  toVueFlowNodes,
} from './flowGraph'

const sample: FlowNode[] = [
  { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
  { id: 2, parentId: 1, type: 'sendMessage', data: { payload: [] } },
  { id: 3, parentId: 2, type: 'dateTime', data: { times: [], connectors: [4, 5], timezone: 'UTC', action: 'businessHours' } },
  { id: 4, parentId: 3, type: 'dateTimeConnector', data: { connectorType: 'success' } },
  { id: 5, parentId: 3, type: 'dateTimeConnector', data: { connectorType: 'failure' } },
]

describe('buildEdgesFromNodes', () => {
  it('skips the root node (parentId -1)', () => {
    const edges = buildEdgesFromNodes(sample)
    expect(edges).toHaveLength(sample.length - 1)
    expect(edges.some((edge) => edge.target === '1')).toBe(false)
  })

  it('maps each non-root node to a customEdge carrying insert data for the mid-edge add button', () => {
    const edges = buildEdgesFromNodes(sample)
    expect(edges).toContainEqual({
      id: 'e-1-2',
      source: '1',
      target: '2',
      type: 'customEdge',
      data: { kind: 'insert', sourceId: 1, targetId: 2, hoverColor: '#64748b', addable: true },
    })
  })

  it('marks edges out of a non-addable parent type (e.g. dateTime) as not addable', () => {
    const edges = buildEdgesFromNodes(sample)
    expect(edges).toContainEqual({
      id: 'e-3-4',
      source: '3',
      target: '4',
      type: 'customEdge',
      data: { kind: 'insert', sourceId: 3, targetId: 4, hoverColor: '#f59e0b', addable: false },
    })
    expect(edges).toContainEqual({
      id: 'e-3-5',
      source: '3',
      target: '5',
      type: 'customEdge',
      data: { kind: 'insert', sourceId: 3, targetId: 5, hoverColor: '#f59e0b', addable: false },
    })
  })
})

describe('isInteractiveNodeType', () => {
  it('returns false for trigger and dateTimeConnector', () => {
    expect(isInteractiveNodeType('trigger')).toBe(false)
    expect(isInteractiveNodeType('dateTimeConnector')).toBe(false)
  })

  it('returns true for sendMessage, addComment, and dateTime', () => {
    expect(isInteractiveNodeType('sendMessage')).toBe(true)
    expect(isInteractiveNodeType('addComment')).toBe(true)
    expect(isInteractiveNodeType('dateTime')).toBe(true)
  })
})

describe('toVueFlowNodes', () => {
  it('produces stable string ids and marks non-interactive nodes unselectable/unfocusable', () => {
    const vueFlowNodes = toVueFlowNodes(sample)
    expect(vueFlowNodes).toHaveLength(sample.length)

    const trigger = vueFlowNodes.find((node) => node.id === '1')
    expect(trigger?.selectable).toBe(false)
    expect(trigger?.focusable).toBe(false)
    expect(trigger?.draggable).toBe(true)

    const sendMessage = vueFlowNodes.find((node) => node.id === '2')
    expect(sendMessage?.selectable).toBe(true)
    expect(sendMessage?.focusable).toBe(true)
  })

  it('keeps a full-width child visually centered under a narrower connector parent', () => {
    const chain: FlowNode[] = [
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
      { id: 2, parentId: 1, type: 'dateTimeConnector', data: { connectorType: 'success' } },
      { id: 3, parentId: 2, type: 'sendMessage', data: { payload: [] } },
    ]
    const vueFlowNodes = toVueFlowNodes(chain)

    const connector = vueFlowNodes.find((node) => node.id === '2')!
    const sendMessage = vueFlowNodes.find((node) => node.id === '3')!

    const connectorCenter = connector.position.x + CONNECTOR_WIDTH / 2
    const sendMessageCenter = sendMessage.position.x + NODE_WIDTH / 2
    expect(connectorCenter).toBe(sendMessageCenter)
  })

  it('places the connector DEFAULT_VERTICAL_SPACING below its parent\'s bottom edge despite its shorter height', () => {
    const chain: FlowNode[] = [
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
      { id: 2, parentId: 1, type: 'dateTimeConnector', data: { connectorType: 'success' } },
    ]
    const vueFlowNodes = toVueFlowNodes(chain)

    const trigger = vueFlowNodes.find((node) => node.id === '1')!
    const connector = vueFlowNodes.find((node) => node.id === '2')!

    const triggerBottom = trigger.position.y + getNodeHeight(chain[0])
    const connectorTop = connector.position.y
    expect(connectorTop - triggerBottom).toBe(DEFAULT_VERTICAL_SPACING)
  })
})

describe('buildNodeTree', () => {
  it('walks depth-first, parent immediately followed by its children', () => {
    const tree = buildNodeTree(sample)
    expect(tree.map((item) => [item.node.id, item.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 3],
      [5, 3],
    ])
  })

  it('marks dateTime as non-selectable while its connector children remain selectable', () => {
    const tree = buildNodeTree(sample)
    expect(tree.find((item) => item.node.id === 3)?.selectable).toBe(false)
    expect(tree.find((item) => item.node.id === 4)?.selectable).toBe(true)
    expect(tree.find((item) => item.node.id === 5)?.selectable).toBe(true)
  })

  it('marks a node as non-selectable once it already has its one allowed child', () => {
    const tree = buildNodeTree(sample)
    // node 1 (trigger) already has child node 2; node 2 (sendMessage) already has child node 3
    expect(tree.find((item) => item.node.id === 1)?.selectable).toBe(false)
    expect(tree.find((item) => item.node.id === 2)?.selectable).toBe(false)
  })

  it('keeps a childless node selectable', () => {
    const childless: FlowNode[] = [
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
    ]
    const tree = buildNodeTree(childless)
    expect(tree.find((item) => item.node.id === 1)?.selectable).toBe(true)
  })

})

describe('buildAddNodePlaceholders', () => {
  it('adds one placeholder node + dashed customEdge per leaf node (nodes with no children)', () => {
    const positions = computeNodePositions(sample)
    const { nodes, edges } = buildAddNodePlaceholders(sample, positions)

    expect(nodes).toHaveLength(2)
    expect(nodes.map((node) => node.id).sort()).toEqual(['add-4', 'add-5'])
    expect(nodes.every((node) => node.type === 'addNodePlaceholder')).toBe(true)

    expect(edges).toHaveLength(2)
    expect(edges).toContainEqual({
      id: 'add-edge-4',
      source: '4',
      target: 'add-4',
      type: 'customEdge',
      data: { kind: 'add', sourceId: 4, parentId: 4, hoverColor: '#22c55e', addable: true },
    })
  })

  it('colors the leaf add-edge by connectorType for dateTimeConnector leaves (success vs failure)', () => {
    const positions = computeNodePositions(sample)
    const { edges } = buildAddNodePlaceholders(sample, positions)

    expect(edges.find((edge) => edge.id === 'add-edge-4')?.data?.hoverColor).toBe('#22c55e')
    expect(edges.find((edge) => edge.id === 'add-edge-5')?.data?.hoverColor).toBe('#ef4444')
  })

  it('places the placeholder half the vertical spacing below the leaf', () => {
    const positions = computeNodePositions(sample)
    const { nodes } = buildAddNodePlaceholders(sample, positions)
    const leaf = sample.find((node) => node.id === 4)!
    const leafPosition = positions.get(4)!
    const placeholder = nodes.find((node) => node.id === 'add-4')!

    const leafBottomY = leafPosition.y + getNodeHeight(leaf) / 2
    expect(placeholder.position).toEqual({ x: leafPosition.x, y: leafBottomY + DEFAULT_VERTICAL_SPACING / 2 })
  })
})

describe('getNodeDescription', () => {
  it('prefers an explicit description override for types without fixed auto-generated text', () => {
    const node: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'addComment',
      description: 'custom note',
      data: { comment: '' },
    }
    expect(getNodeDescription(node)).toBe('custom note')
  })

  it('ignores an explicit description override for dateTime and trigger, whose fixed auto-generated text always wins', () => {
    const dateTime: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'dateTime',
      description: 'custom note',
      data: { times: [], connectors: [], timezone: 'UTC', action: 'businessHours' },
    }
    const trigger: FlowNode = {
      id: 2,
      parentId: -1,
      type: 'trigger',
      description: 'custom note',
      data: { type: 'conversationOpened', oncePerContact: true },
    }
    expect(getNodeDescription(dateTime)).toBe('Business Hours - UTC')
    expect(getNodeDescription(trigger)).toBe('Conversation Opened')
  })

  it('describes a dateTime node by its timezone', () => {
    const node: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'dateTime',
      data: { times: [], connectors: [], timezone: 'Asia/Kuala_Lumpur', action: 'businessHours' },
    }
    expect(getNodeDescription(node)).toBe('Business Hours - Asia/Kuala_Lumpur')
  })

  it('describes a trigger node by its camelCase type', () => {
    const node: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'trigger',
      data: { type: 'conversationOpened', oncePerContact: true },
    }
    expect(getNodeDescription(node)).toBe('Conversation Opened')
  })

  it('describes a sendMessage node using its text payload item', () => {
    const node: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'sendMessage',
      data: { payload: [{ type: 'text', text: 'Hi there' }] },
    }
    expect(getNodeDescription(node)).toBe('Message:\nHi there')
  })

  it('returns undefined for a sendMessage node with an empty payload', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'sendMessage', data: { payload: [] } }
    expect(getNodeDescription(node)).toBeUndefined()
  })

  it('returns undefined for a sendMessage node with only attachments and no text', () => {
    const node: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'sendMessage',
      data: { payload: [{ type: 'attachment', attachment: '/favicon.svg' }] },
    }
    expect(getNodeDescription(node)).toBeUndefined()
  })

  it('describes an addComment node using its comment', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'addComment', data: { comment: 'internal note' } }
    expect(getNodeDescription(node)).toBe('Comment:\ninternal note')
  })

  it('returns undefined for an addComment node with no comment and no description override', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'addComment', data: { comment: '' } }
    expect(getNodeDescription(node)).toBeUndefined()
  })

  it('returns undefined for a connector node', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'dateTimeConnector', data: { connectorType: 'success' } }
    expect(getNodeDescription(node)).toBeUndefined()
  })
})
