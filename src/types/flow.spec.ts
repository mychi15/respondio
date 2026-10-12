import { describe, expect, it } from 'vitest'
import type { FlowNode } from './flow'
import { FLOW_NODE_TYPE_LABELS, hasVariableLengthDescription, NON_INTERACTIVE_NODE_TYPES } from './flow'

describe('NON_INTERACTIVE_NODE_TYPES', () => {
  it('contains exactly the display-only node types', () => {
    expect(NON_INTERACTIVE_NODE_TYPES).toEqual(['trigger', 'dateTimeConnector'])
  })
})

describe('FLOW_NODE_TYPE_LABELS', () => {
  it('has a human-readable label for every node type', () => {
    expect(FLOW_NODE_TYPE_LABELS).toEqual({
      trigger: 'Trigger',
      sendMessage: 'Send Message',
      addComment: 'Add Comment',
      dateTime: 'Business Hours',
      dateTimeConnector: 'Connector',
    })
  })
})

describe('hasVariableLengthDescription', () => {
  it('is true whenever an explicit description override is set, regardless of type', () => {
    const trigger: FlowNode = {
      id: 1,
      parentId: -1,
      type: 'trigger',
      description: 'custom note',
      data: { type: 'conversationOpened', oncePerContact: true },
    }
    expect(hasVariableLengthDescription(trigger)).toBe(true)
  })

  it('is true for a sendMessage node with a non-empty payload', () => {
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

  it('is true for an addComment node with a non-empty comment', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'addComment', data: { comment: 'note for agent' } }
    expect(hasVariableLengthDescription(node)).toBe(true)
  })

  it('is false for an addComment node with an empty comment', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'addComment', data: { comment: '' } }
    expect(hasVariableLengthDescription(node)).toBe(false)
  })

  it('is false for dateTime and trigger nodes, since their auto-generated text is short and fixed-format', () => {
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

  it('is false for a connector node', () => {
    const node: FlowNode = { id: 1, parentId: -1, type: 'dateTimeConnector', data: { connectorType: 'success' } }
    expect(hasVariableLengthDescription(node)).toBe(false)
  })
})
