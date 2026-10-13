import type { EdgeProps, GraphNode } from '@vue-flow/core'
import { Position } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AddEdgeData } from '@/utils/flowGraph'
import { useCreateNodeModal } from '@/composables/useCreateNodeModal'
import FlowAddEdge from './FlowAddEdge.vue'

function buildProps(data: AddEdgeData | undefined): EdgeProps<AddEdgeData> {
  return {
    id: 'e-1-2',
    sourceNode: {} as GraphNode,
    targetNode: {} as GraphNode,
    source: '1',
    target: '2',
    type: 'customEdge',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    markerStart: '',
    markerEnd: '',
    data: data as AddEdgeData,
    events: {} as EdgeProps<AddEdgeData>['events'],
  }
}

describe('FlowAddEdge', () => {
  beforeEach(() => {
    useCreateNodeModal().close()
  })

  it('opens the create-node modal with an insert attachment when the insert button is clicked', async () => {
    const data: AddEdgeData = { kind: 'insert', sourceId: 1, targetId: 2, hoverColor: '#f97316', addable: true }
    const wrapper = mount(FlowAddEdge, { props: buildProps(data) })

    await wrapper.find('button').trigger('click')

    const { isOpen, invocation } = useCreateNodeModal()
    expect(isOpen.value).toBe(true)
    expect(invocation.value).toEqual({
      source: 'quickAdd',
      attachment: { mode: 'insert', sourceId: 1, targetId: 2 },
    })
  })

  it('opens the create-node modal with an add attachment when the add button is clicked', async () => {
    const data: AddEdgeData = { kind: 'add', sourceId: 1, parentId: 3, hoverColor: '#f97316', addable: true }
    const wrapper = mount(FlowAddEdge, { props: buildProps(data) })

    await wrapper.find('button').trigger('click')

    const { isOpen, invocation } = useCreateNodeModal()
    expect(isOpen.value).toBe(true)
    expect(invocation.value).toEqual({
      source: 'quickAdd',
      attachment: { mode: 'add', parentId: 3 },
    })
  })

  it('does not render the add button when the edge is not addable', () => {
    const data: AddEdgeData = { kind: 'add', sourceId: 1, parentId: 1, hoverColor: '#f97316', addable: false }
    const wrapper = mount(FlowAddEdge, { props: buildProps(data) })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders the add button when the edge is addable', () => {
    const data: AddEdgeData = { kind: 'add', sourceId: 1, parentId: 1, hoverColor: '#f97316', addable: true }
    const wrapper = mount(FlowAddEdge, { props: buildProps(data) })

    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('labels the button with the nodes it adds between', () => {
    const data: AddEdgeData = { kind: 'insert', sourceId: 1, targetId: 2, hoverColor: '#f97316', addable: true }
    const props = {
      ...buildProps(data),
      sourceNode: { data: { id: 1, type: 'sendMessage', name: 'Welcome message' } } as GraphNode,
      targetNode: { data: { id: 2, type: 'addComment' } } as GraphNode,
    }
    const wrapper = mount(FlowAddEdge, { props })

    expect(wrapper.find('button').attributes('aria-label')).toBe('Insert node between Welcome message and Add Comment')
  })

  it('labels an add button after its parent node', () => {
    const data: AddEdgeData = { kind: 'add', sourceId: 1, parentId: 1, hoverColor: '#f97316', addable: true }
    const props = { ...buildProps(data), sourceNode: { data: { id: 1, type: 'sendMessage', name: 'Welcome message' } } as GraphNode }
    const wrapper = mount(FlowAddEdge, { props })

    expect(wrapper.find('button').attributes('aria-label')).toBe('Add node after Welcome message')
  })
})
