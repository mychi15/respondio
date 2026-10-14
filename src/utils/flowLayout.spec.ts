import { describe, expect, it } from 'vitest'
import type { FlowNode } from '@/types/flow'
import {
  applyAutoLayout,
  computeNodePositions,
  DEFAULT_VERTICAL_SPACING,
  fillMissingPositions,
  getNodeHeight,
  hasVariableLengthDescription,
  HORIZONTAL_SPACING,
  NODE_HEIGHT,
  NODE_WITH_DESCRIPTION_HEIGHT,
  positionBelow,
  shiftSubtree,
} from './flowLayout'

const sample: FlowNode[] = [
  { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
  { id: 2, parentId: 1, type: 'sendMessage', data: { payload: [] } },
  { id: 3, parentId: 2, type: 'dateTime', data: { times: [], connectors: [4, 5], timezone: 'UTC', action: 'businessHours' } },
  { id: 4, parentId: 3, type: 'dateTimeConnector', data: { connectorType: 'success' } },
  { id: 5, parentId: 3, type: 'dateTimeConnector', data: { connectorType: 'failure' } },
]

describe('computeNodePositions', () => {
  it('returns an empty map for an empty node list', () => {
    expect(computeNodePositions([])).toEqual(new Map())
  })

  it('places each child\'s top edge DEFAULT_VERTICAL_SPACING below its direct parent\'s bottom edge', () => {
    const positions = computeNodePositions(sample)
    const nodesById = new Map(sample.map((node) => [node.id, node]))

    for (const node of sample) {
      if (node.parentId === -1) continue
      const parent = nodesById.get(node.parentId)!
      const parentBottom = positions.get(parent.id)!.y + getNodeHeight(parent) / 2
      const childTop = positions.get(node.id)!.y - getNodeHeight(node) / 2
      expect(childTop - parentBottom).toBe(DEFAULT_VERTICAL_SPACING)
    }
  })

  it('reserves the taller height for any node that actually renders a description', () => {
    const sendMessageWithText: FlowNode = {
      id: 2,
      parentId: 1,
      type: 'sendMessage',
      data: { payload: [{ type: 'text', text: 'hi' }] },
    }
    const sendMessageEmpty: FlowNode = { id: 3, parentId: 1, type: 'sendMessage', data: { payload: [] } }
    const addCommentWithDescription: FlowNode = {
      id: 4,
      parentId: 1,
      type: 'addComment',
      description: 'a note',
      data: { comment: '' },
    }
    const addCommentWithComment: FlowNode = {
      id: 5,
      parentId: 1,
      type: 'addComment',
      data: { comment: 'route to sales queue' },
    }
    const addCommentEmpty: FlowNode = { id: 6, parentId: 1, type: 'addComment', data: { comment: '' } }

    expect(getNodeHeight(sendMessageWithText)).toBe(NODE_WITH_DESCRIPTION_HEIGHT)
    expect(getNodeHeight(addCommentWithDescription)).toBe(NODE_WITH_DESCRIPTION_HEIGHT)
    expect(getNodeHeight(addCommentWithComment)).toBe(NODE_WITH_DESCRIPTION_HEIGHT)
    expect(getNodeHeight(sendMessageEmpty)).toBe(NODE_HEIGHT)
    expect(getNodeHeight(addCommentEmpty)).toBe(NODE_HEIGHT)
  })

  it('gives sibling connector branches distinct x values', () => {
    const positions = computeNodePositions(sample)
    const successX = positions.get(4)?.x
    const failureX = positions.get(5)?.x
    expect(successX).not.toBe(failureX)
    expect(Math.abs((successX ?? 0) - (failureX ?? 0))).toBe(HORIZONTAL_SPACING)
  })

  it('centers a single child directly under its single parent', () => {
    const chain: FlowNode[] = [
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
      { id: 2, parentId: 1, type: 'sendMessage', data: { payload: [] } },
    ]
    const positions = computeNodePositions(chain)
    expect(positions.get(1)?.x).toBe(positions.get(2)?.x)
  })

  it('centers a parent over the midpoint of its two children', () => {
    const positions = computeNodePositions(sample)
    const parentCenter = positions.get(3)?.x ?? 0
    const childMidpoint = ((positions.get(4)?.x ?? 0) + (positions.get(5)?.x ?? 0)) / 2
    expect(parentCenter).toBe(childMidpoint)
  })

  it('keeps both branches equidistant from the parent even when one branch has a wider subtree', () => {
    const skewed: FlowNode[] = [
      { id: 1, parentId: -1, type: 'trigger', data: { type: 'conversationOpened', oncePerContact: true } },
      { id: 2, parentId: 1, type: 'dateTime', data: { times: [], connectors: [3, 4], timezone: 'UTC', action: 'businessHours' } },
      { id: 3, parentId: 2, type: 'dateTimeConnector', data: { connectorType: 'success' } },
      { id: 4, parentId: 2, type: 'dateTimeConnector', data: { connectorType: 'failure' } },
      // extra children under the success branch, making it wider than the failure branch
      { id: 5, parentId: 3, type: 'sendMessage', data: { payload: [] } },
      { id: 6, parentId: 3, type: 'addComment', data: { comment: '' } },
    ]

    const positions = computeNodePositions(skewed)
    const parentX = positions.get(2)!.x
    const leftDistance = parentX - positions.get(3)!.x
    const rightDistance = positions.get(4)!.x - parentX

    expect(leftDistance).toBe(rightDistance)
  })
})

describe('hasVariableLengthDescription', () => {
  it('is true whenever the node has a description', () => {
    const addComment: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'addComment',
      description: 'custom note',
      data: { comment: '' },
    }
    expect(hasVariableLengthDescription(addComment)).toBe(true)
  })

  it('is true for dateTime and trigger nodes with a description, since it replaces their single-line auto-generated text', () => {
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
    expect(hasVariableLengthDescription(dateTime)).toBe(true)
    expect(hasVariableLengthDescription(trigger)).toBe(true)
  })

  it('is false for dateTime and trigger nodes without a description', () => {
    const dateTime: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'dateTime',
      data: { times: [], connectors: [], timezone: 'UTC', action: 'businessHours' },
    }
    const trigger: FlowNode = {
      id: 2,
      parentId: -1,
      type: 'trigger',
      data: { type: 'conversationOpened', oncePerContact: true },
    }
    expect(hasVariableLengthDescription(dateTime)).toBe(false)
    expect(hasVariableLengthDescription(trigger)).toBe(false)
  })

  it('is true for a sendMessage node with message text', () => {
    const node: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'sendMessage',
      data: { payload: [{ type: 'text', text: 'hi' }] },
    }
    expect(hasVariableLengthDescription(node)).toBe(true)
  })

  it('is false for a sendMessage node with an empty payload', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'sendMessage', data: { payload: [] } }
    expect(hasVariableLengthDescription(node)).toBe(false)
  })

  it('is false for a sendMessage node with only attachments and no text', () => {
    const node: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'sendMessage',
      data: { payload: [{ type: 'attachment', attachment: '/favicon.svg' }] },
    }
    expect(hasVariableLengthDescription(node)).toBe(false)
  })

  it('is true for an addComment node with a non-empty comment', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'addComment', data: { comment: 'note for agent' } }
    expect(hasVariableLengthDescription(node)).toBe(true)
  })

  it('is false for an addComment node with an empty comment', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'addComment', data: { comment: '' } }
    expect(hasVariableLengthDescription(node)).toBe(false)
  })

  it('is false for a connector node', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'dateTimeConnector', data: { connectorType: 'success' } }
    expect(hasVariableLengthDescription(node)).toBe(false)
  })
})

describe('fillMissingPositions', () => {
  it('fills every missing position from a single auto-layout pass', () => {
    const nodes = structuredClone(sample)
    fillMissingPositions(nodes)

    const expected = computeNodePositions(sample)
    for (const node of nodes) expect(node.position).toEqual(expected.get(node.id))
  })

  it('keeps positions that are already stored', () => {
    const nodes = structuredClone(sample)
    nodes[1].position = { x: 999, y: 999 }
    fillMissingPositions(nodes)

    expect(nodes[1].position).toEqual({ x: 999, y: 999 })
    expect(nodes[0].position).toEqual(computeNodePositions(sample).get(1))
  })
})

describe('applyAutoLayout', () => {
  it('overwrites stored positions with the auto-layout result', () => {
    const nodes = structuredClone(sample)
    nodes[1].position = { x: 999, y: 999 }
    applyAutoLayout(nodes)

    expect(nodes[1].position).toEqual(computeNodePositions(sample).get(2))
  })
})

describe('positionBelow', () => {
  it('places the child one vertical gap below the parent, centered', () => {
    const parent: FlowNode = { ...sample[1], position: { x: 10, y: 20 } }
    const child = sample[2]

    expect(positionBelow(parent, child)).toEqual({
      x: 10,
      y: 20 + getNodeHeight(parent) / 2 + DEFAULT_VERTICAL_SPACING + getNodeHeight(child) / 2,
    })
  })

  it('applies the horizontal offset', () => {
    const parent: FlowNode = { ...sample[2], position: { x: 0, y: 0 } }
    expect(positionBelow(parent, sample[3], -50).x).toBe(-50)
  })
})

describe('shiftSubtree', () => {
  it('moves only the given node and its descendants', () => {
    const nodes = structuredClone(sample)
    fillMissingPositions(nodes)
    const before = new Map(nodes.map((node) => [node.id, { ...node.position! }]))

    shiftSubtree(nodes, 3, 50)

    for (const node of nodes) {
      const dy = [3, 4, 5].includes(node.id as number) ? 50 : 0
      expect(node.position).toEqual({ x: before.get(node.id)!.x, y: before.get(node.id)!.y + dy })
    }
  })
})
