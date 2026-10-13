import type { NodeProps } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { FlowNode } from '@/types/flow'
import FlowNodeRenderer from './FlowNodeRenderer.vue'

function buildProps(id: string, data: FlowNode): NodeProps<FlowNode> {
  return {
    id,
    type: data.type,
    data,
    selected: false,
    connectable: true,
    position: { x: 0, y: 0 },
    dimensions: { width: 0, height: 0 },
    dragging: false,
    resizing: false,
    zIndex: 0,
    events: {} as NodeProps<FlowNode>['events'],
  }
}

const sendMessageNode: FlowNode = {
  id: 2,
  parentId: 1,
  type: 'sendMessage',
  name: 'Welcome message',
  description: 'A long description that should be clamped to three lines of text in the card body.',
  data: { payload: [] },
}

const triggerNode: FlowNode = {
  id: 1,
  parentId: -1,
  type: 'trigger',
  data: { type: 'conversationOpened', oncePerContact: true },
}

const connectorNode: FlowNode = {
  id: 4,
  parentId: 3,
  type: 'dateTimeConnector',
  data: { connectorType: 'success' },
}

describe('FlowNodeRenderer', () => {
  it('renders the icon, title, and clamped description for an interactive node', () => {
    const wrapper = mount(FlowNodeRenderer, { props: buildProps('2', sendMessageNode) })

    expect(wrapper.text()).toContain('Welcome message')
    expect(wrapper.find('svg').exists()).toBe(true)
    const description = wrapper.find('p')
    expect(description.classes()).toContain('line-clamp-3')
    expect(description.text()).toContain('A long description')
  })

  it('emits click when an interactive node is clicked', async () => {
    const wrapper = mount(FlowNodeRenderer, { props: buildProps('2', sendMessageNode) })

    await wrapper.find('div').trigger('click')

    expect(wrapper.emitted('click')).toEqual([[2]])
  })

  it('does not emit click for a trigger node', async () => {
    const wrapper = mount(FlowNodeRenderer, { props: buildProps('1', triggerNode) })

    await wrapper.find('div').trigger('click')

    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('does not emit click for a connector node', async () => {
    const wrapper = mount(FlowNodeRenderer, { props: buildProps('4', connectorNode) })

    await wrapper.find('div').trigger('click')

    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('renders a connector node as a plain labeled block with no icon or description', () => {
    const wrapper = mount(FlowNodeRenderer, { props: buildProps('4', connectorNode) })

    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.text()).toBe('Success')
  })
})
